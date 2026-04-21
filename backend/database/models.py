from datetime import datetime, date as d
from sqlalchemy import String, Integer, Float, Date, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
import uuid
import enum

class Base(DeclarativeBase):
    pass

class AccountType(str, enum.Enum):
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    EQUITY = "EQUITY"
    REVENUE = "REVENUE"
    EXPENSE = "EXPENSE"

class NormalBalance(str, enum.Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"

class Account(Base):
    """Chart of Accounts"""
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    account_type: Mapped[AccountType] = mapped_column(Enum(AccountType))
    normal_balance: Mapped[NormalBalance] = mapped_column(Enum(NormalBalance))
    description: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Running balance can be calculated on the fly or maintained as a field.
    # We will enforce calculations via ledger service, but store current balance here for caching
    current_balance: Mapped[float] = mapped_column(Float, default=0.0)

class Transaction(Base):
    """Journal Entries"""
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date: Mapped[d] = mapped_column(Date, index=True)
    
    # Simple denormalized journal entry layout, or we can use TransactionHeader + TransactionLine
    # The prompt requested: debit account, credit account, amount.
    # In double entry, a single transaction might have multiple debits/credits.
    # For simplicity to match the prompt's example, we can use lines or simple fields.
    # Let's use TransactionHeader and TransactionLine for true double-entry support.
    
    description: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    lines: Mapped[list["TransactionLine"]] = relationship("TransactionLine", back_populates="transaction", cascade="all, delete-orphan")

class TransactionLine(Base):
    __tablename__ = "transaction_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("transactions.id"))
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("accounts.id"))
    
    debit: Mapped[float] = mapped_column(Float, default=0.0)
    credit: Mapped[float] = mapped_column(Float, default=0.0)
    
    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="lines")
    account: Mapped["Account"] = relationship("Account")

class MemoryPattern(Base):
    """Stores recurring transaction patterns with vector embeddings for semantic search"""
    __tablename__ = "memory_patterns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    description_pattern: Mapped[str] = mapped_column(Text, index=True)
    debit_account_name: Mapped[str] = mapped_column(String)
    credit_account_name: Mapped[str] = mapped_column(String)
    frequency: Mapped[str] = mapped_column(String, nullable=True) # e.g., Monthly
    
    # OpenAI text-embedding-ada-002 outputs 1536 dimensions
    embedding: Mapped[Vector] = mapped_column(Vector(1536))

class PolicyMemory(Base):
    """Stores company accounting policies"""
    __tablename__ = "policy_memory"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_name: Mapped[str] = mapped_column(String, unique=True)
    policy_value: Mapped[str] = mapped_column(Text)

class FinancialInsight(Base):
    """Stores historical financial insights"""
    __tablename__ = "financial_insights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    insight_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
