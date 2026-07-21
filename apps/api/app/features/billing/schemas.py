from sqlmodel import SQLModel


class BalanceRead(SQLModel):
    balance: float
    plan: str = "free"
