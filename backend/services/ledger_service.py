from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database.models import Account, TransactionLine, AccountType, NormalBalance
import uuid
from typing import List, Dict

class LedgerService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_account_balance(self, account_id: uuid.UUID) -> float:
        """Calculates the true balance from the ledger lines based on normal balance rules."""
        account = await self.session.get(Account, account_id)
        if not account:
            raise ValueError("Account not found")

        stmt = select(
            func.sum(TransactionLine.debit).label("total_debit"),
            func.sum(TransactionLine.credit).label("total_credit")
        ).where(TransactionLine.account_id == account_id)
        
        result = await self.session.execute(stmt)
        row = result.first()
        
        total_debit = row.total_debit or 0.0
        total_credit = row.total_credit or 0.0

        if account.normal_balance == NormalBalance.DEBIT:
            return total_debit - total_credit
        else:
            return total_credit - total_debit
            
    async def get_all_balances(self) -> Dict[str, float]:
        """Returns the Trial Balance essentially"""
        stmt = select(Account)
        result = await self.session.execute(stmt)
        accounts = result.scalars().all()
        
        balances = {}
        for acc in accounts:
            balances[acc.name] = await self.get_account_balance(acc.id)
            
        return balances
