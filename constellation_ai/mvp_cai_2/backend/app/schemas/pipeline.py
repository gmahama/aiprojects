from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel, field_validator, model_validator

from app.models.pipeline import PipelineStatus, STAGE_LABELS


# --- Request schemas ---

class PipelineItemCreate(BaseModel):
    organization_id: UUID
    primary_contact_id: UUID | None = None
    stage: int = 1
    owner_id: UUID
    notes: str | None = None

    @field_validator("stage")
    @classmethod
    def stage_must_be_valid(cls, v: int) -> int:
        if v < 1 or v > 6:
            raise ValueError("stage must be between 1 and 6")
        return v


class PipelineItemUpdate(BaseModel):
    primary_contact_id: UUID | None = None
    stage: int | None = None
    status: PipelineStatus | None = None
    owner_id: UUID | None = None
    notes: str | None = None
    back_burner_reason: str | None = None
    passed_reason: str | None = None

    @field_validator("stage")
    @classmethod
    def stage_must_be_valid(cls, v: int | None) -> int | None:
        if v is not None and (v < 1 or v > 6):
            raise ValueError("stage must be between 1 and 6")
        return v

    @model_validator(mode="after")
    def validate_reasons(self) -> "PipelineItemUpdate":
        if self.status == PipelineStatus.BACK_BURNER and not self.back_burner_reason:
            raise ValueError("back_burner_reason is required when status is BACK_BURNER")
        if self.status == PipelineStatus.PASSED and not self.passed_reason:
            raise ValueError("passed_reason is required when status is PASSED")
        return self


class PipelineAdvanceRequest(BaseModel):
    note: str | None = None


class PipelineRevertRequest(BaseModel):
    note: str


class PipelineReactivateRequest(BaseModel):
    note: str
    stage: int | None = None

    @field_validator("stage")
    @classmethod
    def stage_must_be_valid(cls, v: int | None) -> int | None:
        if v is not None and (v < 1 or v > 6):
            raise ValueError("stage must be between 1 and 6")
        return v


# --- Response schemas ---

class PipelineStageHistoryResponse(BaseModel):
    id: UUID
    pipeline_item_id: UUID
    from_stage: int | None
    to_stage: int
    from_status: str | None
    to_status: str
    changed_by_id: UUID
    changed_by_name: str | None = None
    from_stage_label: str | None = None
    to_stage_label: str | None = None
    note: str | None
    changed_at: datetime

    class Config:
        from_attributes = True


class PipelineItemResponse(BaseModel):
    id: UUID
    organization_id: UUID
    organization_name: str | None = None
    primary_contact_id: UUID | None
    primary_contact_name: str | None = None
    stage: int
    stage_label: str | None = None
    status: PipelineStatus
    owner_id: UUID
    owner_name: str | None = None
    created_by: UUID
    back_burner_reason: str | None
    passed_reason: str | None
    notes: str | None
    entered_pipeline_at: datetime
    last_stage_change_at: datetime
    days_in_stage: int | None = None
    days_in_pipeline: int | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PipelineItemDetail(PipelineItemResponse):
    stage_history: list[PipelineStageHistoryResponse] = []

    class Config:
        from_attributes = True


class PipelineItemListResponse(BaseModel):
    items: list[PipelineItemResponse]
    total: int
    page: int
    page_size: int


# --- Board response ---

class PipelineBoardStage(BaseModel):
    stage: int
    label: str
    items: list[PipelineItemResponse]


class PipelineBackBurnerItem(PipelineItemResponse):
    stage_when_shelved: int | None = None
    stage_when_shelved_label: str | None = None


class PipelineBoardSummary(BaseModel):
    total_active: int
    total_back_burner: int
    total_passed: int
    total_converted: int


class PipelineBoardResponse(BaseModel):
    stages: list[PipelineBoardStage]
    back_burner: list[PipelineBackBurnerItem]
    summary: PipelineBoardSummary
