from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database.models import MemoryPattern, PolicyMemory, FinancialInsight
import uuid
from typing import List, Optional

class MemoryService:
    def __init__(self, session: AsyncSession):
        self.session = session

    # --- Policy Memory ---
    async def get_policy(self, policy_name: str) -> Optional[str]:
        stmt = select(PolicyMemory).where(PolicyMemory.policy_name == policy_name)
        result = await self.session.execute(stmt)
        policy = result.scalar_one_or_none()
        return policy.policy_value if policy else None

    async def set_policy(self, policy_name: str, policy_value: str) -> PolicyMemory:
        stmt = select(PolicyMemory).where(PolicyMemory.policy_name == policy_name)
        result = await self.session.execute(stmt)
        policy = result.scalar_one_or_none()
        
        if policy:
            policy.policy_value = policy_value
        else:
            policy = PolicyMemory(policy_name=policy_name, policy_value=policy_value)
            self.session.add(policy)
            
        await self.session.commit()
        await self.session.refresh(policy)
        return policy

    # --- Financial Insight Memory ---
    async def add_insight(self, insight_text: str) -> FinancialInsight:
        insight = FinancialInsight(insight_text=insight_text)
        self.session.add(insight)
        await self.session.commit()
        await self.session.refresh(insight)
        return insight
        
    async def get_recent_insights(self, limit: int = 5) -> List[FinancialInsight]:
        stmt = select(FinancialInsight).order_by(FinancialInsight.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    # --- Pattern Memory Context (Vector Search Stub) ---
    async def find_similar_pattern(self, description: str):
        # PGVector implementation stub
        return []
