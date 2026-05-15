import logging
from typing import List, Dict

from api.schemas.employee import EmployeeDataRequest, RecommendationPayload
from api.services.inference_service import InferenceService

logger = logging.getLogger(__name__)

class RecommendationEngine:
    """
    Enterprise Prescriptive Analytics Service.
    Fuses predictions from the ML layer with deterministic HR business rules 
    to generate actionable, structured recommendations.
    """

    @classmethod
    def generate_prescriptive_actions(cls, employee: EmployeeDataRequest) -> RecommendationPayload:
        """
        Orchestrates inferences and applies business logic to generate HR actions.
        """
        logger.info(f"Generating prescriptive recommendations for {employee.employee_id}")

        # 1. Gather Predictions via the RAM-Cached Inference Service
        attr_payload = InferenceService.predict_attrition(employee)
        burnout_payload = InferenceService.predict_burnout(employee)
        perf_payload = InferenceService.predict_performance(employee)

        attrition_risk = attr_payload.attrition_risk_score or 0.0
        burnout_score = burnout_payload.burnout_score or 0.0
        perf_rating = perf_payload.predicted_performance or 3  # Assume 3 (Average) as fallback

        # 2. Recreate Synthetic Base Metrics for Rule Logic
        # (Since we removed these from the API payload to prevent leakage)
        engagement_proxy = employee.job_satisfaction + employee.relationship_satisfaction + employee.work_life_balance

        recommendations: List[str] = []
        risk_level = "Low"
        impact_statement = "Standard retention protocols apply."

        # 3. Burnout Risk Detection
        if burnout_score > 7.5:
            recommendations.append("Critical burnout risk detected. Recommend immediate 1-on-1 and mandatory PTO discussion.")
            risk_level = "High" if risk_level != "Critical" else "Critical"
        elif burnout_score > 5.0 and employee.over_time == 'Yes':
            recommendations.append("Moderate burnout risk. Consider workload reduction and strictly limiting overtime hours.")

        # 4. Promotion / Retention Recommendation
        # perf_rating is now a discrete class (1, 2, 3, or 4)
        if perf_rating == 4 and employee.years_at_company >= 3 and employee.job_level < 4:
            recommendations.append("Promotion highly recommended. Consistent top-tier performance detected with solid tenure.")
        elif perf_rating >= 3 and employee.percent_salary_hike < 12.0:
            recommendations.append("Review compensation. Employee is performing well but salary hike is below industry retention standards.")

        # 5. Leadership Training Suggestion
        if engagement_proxy >= 10 and perf_rating >= 3 and employee.job_level <= 2:
            recommendations.append("Leadership track suggested. Employee shows outstanding engagement and solid performance.")

        # 6. Flight Risk (Attrition) Mitigation
        if attrition_risk > 0.75:
            risk_level = "Critical"
            impact_statement = "+25% retention probability if immediate compensation/environmental interventions are applied."
            
            if employee.percent_salary_hike < 10.0:
                recommendations.append("Critical flight risk. Immediate compensation review required.")
            if employee.environment_satisfaction <= 2:
                recommendations.append("Critical flight risk. Conduct immediate stay-interview focusing on workplace environmental conditions.")
                
        elif attrition_risk > 0.50:
            risk_level = "Medium" if risk_level == "Low" else risk_level
            impact_statement = "+10% retention probability with proactive engagement."
            recommendations.append("Elevated flight risk. Manager should initiate an informal check-in this week.")

        # 7. Baseline Fallback
        if not recommendations:
            recommendations.append("Employee metrics are highly stable. Continue standard quarterly check-ins.")

        # 8. Package into Strict Pydantic Payload
        return RecommendationPayload(
            employee_id=employee.employee_id,
            risk_level=risk_level,
            actionable_recommendations=recommendations,
            estimated_retention_impact=impact_statement
        )

# Example Usage in a FastAPI Router:
# @router.post("/recommendations", response_model=APIResponseEnvelope)
# async def get_recommendations(payload: EmployeeDataRequest):
#     recs = RecommendationEngine.generate_prescriptive_actions(payload)
#     return APIResponseEnvelope(status="success", data=recs)