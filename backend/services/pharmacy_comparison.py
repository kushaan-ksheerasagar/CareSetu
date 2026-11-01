"""
CareSetu Pharmacy Comparison Service
Ranks and compares pharmacy fulfillment options across price, speed, serviceability,
and integration mode (direct API vs app navigation).
"""

from datetime import datetime, timezone
from typing import List, Optional
from backend.models.pharmacy import PharmacyOption, PharmacyComparisonResult

class PharmacyComparisonService:
    @staticmethod
    def compare_options(
        query_medicines: List[str],
        pincode: str,
        options: List[PharmacyOption]
    ) -> PharmacyComparisonResult:
        """
        Evaluates a list of pharmacy options and determines recommendations.
        """
        serviceable_options = [opt for opt in options if opt.is_serviceable and opt.items]
        
        best_price_id: Optional[str] = None
        fastest_id: Optional[str] = None
        warnings: List[str] = []

        if not serviceable_options:
            warnings.append(f"No direct pharmacy delivery options found for PIN code {pincode}. Showing assisted options.")
            return PharmacyComparisonResult(
                query_medicines=query_medicines,
                pincode=pincode,
                options=options,
                best_price_provider=None,
                fastest_delivery_provider=None,
                warnings=warnings,
                timestamp=datetime.now(timezone.utc).isoformat()
            )

        # 1. Best Price
        sorted_by_price = sorted(serviceable_options, key=lambda x: x.total)
        best_price_id = sorted_by_price[0].provider_id

        # 2. Fastest Delivery
        # Priority heuristics: minutes < hours < tomorrow < days
        def delivery_speed_score(opt: PharmacyOption) -> int:
            txt = opt.estimated_delivery.lower()
            if "90 min" in txt or "within 90" in txt or "express" in txt:
                return 1
            if "2-3 hour" in txt or "2 hour" in txt or "today" in txt:
                return 2
            if "tomorrow" in txt or "24" in txt:
                return 3
            if "48" in txt or "1-2 days" in txt or "2-3 days" in txt:
                return 4
            return 5

        sorted_by_speed = sorted(serviceable_options, key=lambda x: (delivery_speed_score(x), x.total))
        fastest_id = sorted_by_speed[0].provider_id

        # Check for any substitutions among options
        for opt in options:
            for item in opt.items:
                if item.is_substitution:
                    warnings.append(
                        f"{opt.provider_name} proposed substitute for {item.name}. Requires approval."
                    )

        # Re-sort options so best recommendations appear first
        # 1st: direct APIs by price, then app navigation
        def overall_rank(opt: PharmacyOption) -> tuple:
            # Direct APIs get priority if serviceable, then price
            type_weight = 0 if opt.provider_type.value == "direct_api" else 1
            serv_weight = 0 if opt.is_serviceable else 2
            return (serv_weight, type_weight, opt.total)

        ranked_options = sorted(options, key=overall_rank)

        return PharmacyComparisonResult(
            query_medicines=query_medicines,
            pincode=pincode,
            options=ranked_options,
            best_price_provider=best_price_id,
            fastest_delivery_provider=fastest_id,
            warnings=warnings,
            timestamp=datetime.now(timezone.utc).isoformat()
        )

