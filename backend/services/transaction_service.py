from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database.models import Transaction, TransactionLine, Account
import uuid
from typing import List, Dict

class TransactionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_transaction(self, date, description: str, lines_data: List[Dict]) -> Transaction:
        # Validate Double Entry
        total_debit = sum(line.get("debit", 0.0) for line in lines_data)
        total_credit = sum(line.get("credit", 0.0) for line in lines_data)
        
        # We allow a small epsilon for floating point math
        if abs(total_debit - total_credit) > 0.001:
            raise ValueError(f"Debit does not equal Credit: {total_debit} != {total_credit}")

        # Create Transaction
        transaction = Transaction(date=date, description=description)
        self.session.add(transaction)
        
        # Create Lines
        for line_data in lines_data:
            line = TransactionLine(
                transaction=transaction,
                account_id=line_data["account_id"],
                debit=line_data.get("debit", 0.0),
                credit=line_data.get("credit", 0.0)
            )
            self.session.add(line)
        
        await self.session.commit()
        await self.session.refresh(transaction)
        return transaction

    async def get_transactions(self) -> List[Transaction]:
        stmt = select(Transaction).options(selectinload(Transaction.lines))
        result = await self.session.execute(stmt)
        return result.scalars().all()
