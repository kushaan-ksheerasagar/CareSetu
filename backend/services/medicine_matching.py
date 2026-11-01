"""
CareSetu Medicine Matching and Safety Service
Strict verification of active ingredients, brand names, strength, dosage forms,
and formulation types (Immediate Release vs Sustained/Extended Release).

Core Safety Invariant:
Never automatically substitute a medicine. Any proposed alternative MUST be flagged,
explained in plain English for elderly users and guardians, and require explicit approval.
"""

import re
import logging
from typing import Dict, Any, List, Optional, Tuple
from backend.models.pharmacy import MedicineItemModel

logger = logging.getLogger("caresetu.services.medicine_matching")

class MedicineMatchingService:
    @staticmethod
    def normalize_string(val: Optional[str]) -> str:
        if not val:
            return ""
        return re.sub(r"[^a-zA-Z0-9]", "", val.lower())

    @classmethod
    def extract_strength_mg(cls, text: str) -> Optional[float]:
        """Extracts numeric milligram strength (e.g. '5mg', '500 mg', '0.5mg')."""
        match = re.search(r"(\d+(?:\.\d+)?)\s*(?:mg|milligram)", text, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass
        return None

    @classmethod
    def is_sustained_release(cls, text: str) -> bool:
        """Detects whether text specifies Sustained Release, Extended Release, or Controlled Release."""
        t = text.lower()
        patterns = [
            r"\bsr\b",
            r"\ber\b",
            r"\bxr\b",
            r"\bcr\b",
            r"sustained\s*release",
            r"extended\s*release",
            r"controlled\s*release",
            r"prolonged\s*release"
        ]
        return any(re.search(p, t) for p in patterns)

    @classmethod
    def check_equivalence_and_safety(
        cls,
        prescribed: MedicineItemModel,
        candidate: MedicineItemModel
    ) -> Tuple[bool, bool, List[str]]:
        """
        Evaluates safety and equivalence between a prescribed medicine and a pharmacy candidate.
        
        Returns:
            (is_exact_match, is_safe_substitute, reasons_or_warnings)
        """
        warnings = []
        is_exact = True
        is_safe_substitute = False

        # 1. Formulation Release Check (Immediate vs Extended Release)
        prescribed_sr = prescribed.is_sustained_release or cls.is_sustained_release(prescribed.name)
        candidate_sr = candidate.is_sustained_release or cls.is_sustained_release(candidate.name)

        if prescribed_sr != candidate_sr:
            is_exact = False
            prescribed_type = "Sustained/Extended Release (SR/ER)" if prescribed_sr else "Immediate Release (IR)"
            candidate_type = "Sustained/Extended Release (SR/ER)" if candidate_sr else "Immediate Release (IR)"
            warn = (
                f"CRITICAL SAFETY WARNING: Formulation mismatch! Prescribed is {prescribed_type}, "
                f"but candidate is {candidate_type}. Substituting SR for IR (or vice-versa) can cause "
                f"dangerous blood level spikes or therapeutic failure. Incompatible without physician consent."
            )
            warnings.append(warn)
            return (False, False, warnings)

        # 2. Strength Check
        presc_strength = cls.extract_strength_mg(prescribed.strength or prescribed.name)
        cand_strength = cls.extract_strength_mg(candidate.strength or candidate.name)

        if presc_strength and cand_strength and presc_strength != cand_strength:
            is_exact = False
            warn = (
                f"DOSE MISMATCH: Prescribed strength is {presc_strength}mg, but pharmacy offered {cand_strength}mg. "
                f"Automatic substitution rejected for patient safety."
            )
            warnings.append(warn)
            return (False, False, warnings)

        # 3. Dosage Form Check (Tablet vs Syrup vs Capsule)
        if prescribed.dosage_form and candidate.dosage_form:
            norm_pf = cls.normalize_string(prescribed.dosage_form)
            norm_cf = cls.normalize_string(candidate.dosage_form)
            if norm_pf != norm_cf and not (norm_pf in ("tablet", "capsule") and norm_cf in ("tablet", "capsule")):
                is_exact = False
                warnings.append(
                    f"Dosage form difference: prescribed is {prescribed.dosage_form}, candidate is {candidate.dosage_form}."
                )

        # 4. Brand vs Generic / Alternate Brand Check
        presc_brand = cls.normalize_string(prescribed.brand_name or prescribed.name)
        cand_brand = cls.normalize_string(candidate.brand_name or candidate.name)

        # If brand names differ, check if active ingredients match
        if presc_brand not in cand_brand and cand_brand not in presc_brand:
            is_exact = False
            presc_generic = cls.normalize_string(prescribed.generic_name or "")
            cand_generic = cls.normalize_string(candidate.generic_name or "")

            if presc_generic and cand_generic and (presc_generic in cand_generic or cand_generic in presc_generic):
                # Safe generic substitution candidate
                is_safe_substitute = True
                warnings.append(
                    f"Alternative brand: {candidate.name} contains the exact same active salt "
                    f"({prescribed.generic_name}) and strength. Price may differ. Requires guardian authorization."
                )
            else:
                warnings.append(
                    f"Brand difference: '{candidate.name}' is an alternative to '{prescribed.name}'. "
                    f"Requires review to verify identical salt composition."
                )
        else:
            is_safe_substitute = True

        return (is_exact, is_safe_substitute, warnings)

    @classmethod
    def generate_elder_explanation(
        cls,
        original_name: str,
        substitute_name: str,
        generic_name: str,
        price_diff: float
    ) -> str:
        """
        Generates clear, reassuring explanation for elderly patients and guardians in plain language.
        """
        diff_text = f"saving ₹{abs(price_diff):.2f}" if price_diff < 0 else f"costing ₹{price_diff:.2f} more"
        return (
            f"Note: {substitute_name} is made by a different trusted pharmaceutical company, "
            f"but has the exact same active medicine ({generic_name}) as your prescribed {original_name}. "
            f"It is therapeutically equivalent, {diff_text}. Priya (your guardian) will review this option before order confirmation."
        )



    @classmethod
    def filter_and_rank_candidates(
        cls,
        prescribed_dict: Dict[str, Any],
        candidates: List[MedicineItemModel]
    ) -> Tuple[Optional[MedicineItemModel], List[MedicineItemModel], List[str]]:
        """
        Filters candidates returned by live pharmacy catalogue.
        Strictly enforces:
        1. Exact strength match (e.g. 5mg stays 5mg).
        2. Exact release formulation match (SR vs IR).
        3. Rejects incompatible strength/dosage form items.
        """
        presc_name = prescribed_dict.get("name", "")
        presc_dosage = prescribed_dict.get("dosage", "")
        presc_strength = cls.extract_strength_mg(f"{presc_name} {presc_dosage}")
        presc_sr = cls.is_sustained_release(f"{presc_name} {presc_dosage}")
        presc_form = prescribed_dict.get("form") or prescribed_dict.get("dosage_form", "Tablet")

        prescribed_model = MedicineItemModel(
            medicine_id="prescribed-ref",
            name=presc_name,
            dosage_form=presc_form,
            is_sustained_release=presc_sr,
            strength=f"{presc_strength}mg" if presc_strength else None,
            price_per_pack=0.0,
            total_price=0.0
        )

        exact_matches: List[MedicineItemModel] = []
        safe_alternatives: List[MedicineItemModel] = []
        rejected_warnings: List[str] = []

        for cand in candidates:
            cand_strength = cls.extract_strength_mg(f"{cand.name} {cand.strength or ''} {cand.generic_name or ''}")
            cand_sr = cand.is_sustained_release or cls.is_sustained_release(cand.name)

            # 1. Reject formulation mismatch
            if presc_sr != cand_sr:
                rejected_warnings.append(
                    f"Excluded '{cand.name}': Formulation mismatch (prescribed {'SR' if presc_sr else 'IR'} vs candidate {'SR' if cand_sr else 'IR'})."
                )
                continue

            # 2. Reject strength mismatch
            if presc_strength and cand_strength and presc_strength != cand_strength:
                rejected_warnings.append(
                    f"Excluded '{cand.name}': Strength mismatch ({cand_strength}mg vs prescribed {presc_strength}mg)."
                )
                continue

            is_exact, is_safe, warns = cls.check_equivalence_and_safety(prescribed_model, cand)
            if is_exact:
                exact_matches.append(cand)
            elif is_safe:
                safe_alternatives.append(cand)
            else:
                rejected_warnings.extend(warns)

        best_match = exact_matches[0] if exact_matches else (safe_alternatives[0] if safe_alternatives else None)
        return (best_match, exact_matches + safe_alternatives, rejected_warnings)
