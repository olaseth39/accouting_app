from sqlalchemy.ext.asyncio import AsyncSession
from database.models import AccountType
from services.ledger_service import LedgerService
from typing import Dict, Any

class ReportingService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.ledger_service = LedgerService(session)

    async def generate_profit_and_loss(self) -> Dict[str, Any]:
        balances = await self.ledger_service.get_all_balances()
        
        # We need account types. For a quick implementation, we can query them or
        # adjust ledger_service to return them.
        from sqlalchemy import select
        from database.models import Account
        stmt = select(Account)
        result = await self.session.execute(stmt)
        accounts = result.scalars().all()
        
        acc_dict = {acc.name: acc for acc in accounts}
        
        revenue = {}
        expenses = {}
        
        total_rev = 0.0
        total_exp = 0.0
        
        for acc_name, balance in balances.items():
            account = acc_dict.get(acc_name)
            if not account: continue
                
            if account.account_type == AccountType.REVENUE:
                revenue[acc_name] = balance
                total_rev += balance
            elif account.account_type == AccountType.EXPENSE:
                expenses[acc_name] = balance
                total_exp += balance
                
        return {
            "Revenue": revenue,
            "Total_Revenue": total_rev,
            "Expenses": expenses,
            "Total_Expenses": total_exp,
            "Net_Profit": total_rev - total_exp
        }
        
    async def generate_balance_sheet(self) -> Dict[str, Any]:
        balances = await self.ledger_service.get_all_balances()
        
        from sqlalchemy import select
        from database.models import Account
        stmt = select(Account)
        result = await self.session.execute(stmt)
        accounts = result.scalars().all()
        
        acc_dict = {acc.name: acc for acc in accounts}
        
        assets = {}
        liabilities = {}
        equity = {}
        
        total_assets = 0.0
        total_liab = 0.0
        total_equity = 0.0
        
        for acc_name, balance in balances.items():
            account = acc_dict.get(acc_name)
            if not account: continue
                
            if account.account_type == AccountType.ASSET:
                assets[acc_name] = balance
                total_assets += balance
            elif account.account_type == AccountType.LIABILITY:
                liabilities[acc_name] = balance
                total_liab += balance
            elif account.account_type == AccountType.EQUITY:
                equity[acc_name] = balance
                total_equity += balance
                
        # Calculating Retained Earnings from P&L (simplified)
        pnl = await self.generate_profit_and_loss()
        net_profit = pnl["Net_Profit"]
        
        equity["Retained Earnings"] = equity.get("Retained Earnings", 0.0) + net_profit
        total_equity += net_profit
        
        return {
            "Assets": assets,
            "Total_Assets": total_assets,
            "Liabilities": liabilities,
            "Total_Liabilities": total_liab,
            "Equity": equity,
            "Total_Equity": total_equity,
            "Balanced": abs(total_assets - (total_liab + total_equity)) < 0.001
        }
