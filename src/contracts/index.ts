// Generated from hsrp-be/openapi.json by scripts/sync-contracts.mjs. Do not edit: change the backend, run
// scripts/export_openapi.py there, then `pnpm contracts:sync` here.

export const INWARD_DECISIONS = ['ACCEPT', 'REJECT'] as const;
export type InwardDecision = (typeof INWARD_DECISIONS)[number];

export const ORDER_CHANNELS = ['DEALER_APP', 'STAFF_WEB', 'CUSTOMER_PORTAL', 'OEM_API', 'OEM_FILE'] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];

export const ORDER_STATUSES = ['RECEIVED', 'VALIDATED', 'AWAITING_APPROVAL', 'AWAITING_PAYMENT', 'CONFIRMED', 'ISSUED', 'QC_PASSED', 'STICKER_PRINTED', 'DISPATCHED', 'INWARDED', 'FITTED', 'COMPLETED', 'REJECTION_REVIEW', 'REJECTED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TYPES = ['NEW', 'OLD', 'REPLACEMENT'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const PAYMENT_STATUSES = ['CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PLATE_POSITIONS = ['FRONT', 'REAR'] as const;
export type PlatePosition = (typeof PLATE_POSITIONS)[number];

export const PLATE_SETS = ['BOTH', 'FRONT', 'REAR'] as const;
export type PlateSet = (typeof PLATE_SETS)[number];

export const PLATE_STATUSES = ['AVAILABLE', 'ALLOCATED', 'FITTED', 'SCRAPPED'] as const;
export type PlateStatus = (typeof PLATE_STATUSES)[number];

export const REPLACEMENT_REASONS = ['DAMAGED', 'THEFT'] as const;
export type ReplacementReason = (typeof REPLACEMENT_REASONS)[number];

export const ROLES = ['ADMIN', 'OPERATIONS', 'STATION_USER', 'DEALER', 'OEM_CLIENT', 'CUSTOMER'] as const;
export type Role = (typeof ROLES)[number];

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const VAHAN_MODES = ['normal', 'slow', 'down', 'not-found'] as const;
export type VahanMode = (typeof VAHAN_MODES)[number];

export const VALIDATION_STEPS = ['oem-catalogue-check', 'oem-vehicle-data', 'vahan-check', 'state-eligibility-rules'] as const;
export type ValidationStepCode = (typeof VALIDATION_STEPS)[number];

export const VEHICLE_CLASSES = ['2W', '3W', 'LMV', 'HMV', 'TRAILER'] as const;
export type VehicleClass = (typeof VEHICLE_CLASSES)[number];

export const VEHICLE_TYPES = ['NON_TRANSPORT', 'TRANSPORT'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  VALIDATED: 'Validated',
  AWAITING_APPROVAL: 'Awaiting approval',
  AWAITING_PAYMENT: 'Awaiting payment',
  CONFIRMED: 'Confirmed',
  ISSUED: 'Issued',
  QC_PASSED: 'QC passed',
  STICKER_PRINTED: 'Sticker printed',
  DISPATCHED: 'Dispatched',
  INWARDED: 'Inwarded',
  FITTED: 'Fitted',
  COMPLETED: 'Completed',
  REJECTION_REVIEW: 'Rejection review',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiClientBody {
  orgId: string;
  name: string;
  roles: Array<string>;
}

export interface BoxLockRequest {
  boxNos: Array<string>;
}

export interface CalendarBody {
  rules: Array<RuleBody>;
}

export interface CancelOrderRequest {
  reason: string;
}

export interface ConfigSetRequest {
  key: string;
  scopeType?: 'global' | 'state' | 'oem' | 'dealer';
  scopeId?: string;
  value?: unknown;
  effectiveFrom?: string | null;
}

export interface CreateChallanRequest {
  stationId: string;
  dealerId: string;
  orderIds: Array<string>;
}

export interface CreateOrderRequest {
  regnNo: string;
  chassisNo: string;
  engineNo: string;
  orderType?: 'NEW' | 'OLD' | 'REPLACEMENT';
  plateSet?: 'BOTH' | 'FRONT' | 'REAR';
  replacementReason?: 'DAMAGED' | 'THEFT' | null;
  evidenceFileId?: string | null;
  dealerCode?: string | null;
  oemCode?: string | null;
  stateCode?: string | null;
  ownerName?: string | null;
  mobile?: string | null;
  email?: string | null;
  remarks?: string | null;
}

export interface CreateUserBody {
  username: string;
  displayName: string;
  password: string;
  roles: Array<string>;
  orgId?: string | null;
  mobile?: string | null;
  email?: string | null;
}

export interface CreditLimitBody {
  creditLimitRupees: number;
}

export interface DecisionRequest {
  decision: 'APPROVE' | 'REJECT';
  remarks: string;
}

export interface DemoBatchBody {
  vehicles?: Array<VehicleSpecBody> | null;
}

export interface DeviceActiveBody {
  active: boolean;
}

export interface ExtraChargeBody {
  code: string;
  name: string;
  amountRupees: number;
  conditions: Record<string, unknown>;
}

export interface FitmentRequest {
  orderId: string;
  frontLaserCode?: string | null;
  rearLaserCode?: string | null;
  fittedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface InwardLine {
  lineId: string;
  decision: 'ACCEPT' | 'REJECT';
  reason?: string | null;
}

export interface InwardRequest {
  lines: Array<InwardLine>;
}

export interface IssuanceRequest {
  stationId: string;
  dealerId: string;
  orderIds: Array<string>;
  boxNos: Array<string>;
}

export interface LayoutBody {
  elements: Array<Record<string, unknown>>;
}

export interface LockBody {
  boxNos: Array<string>;
  stationId: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  deviceId?: string | null;
  deviceName?: string | null;
}

export interface OemBillingBody {
  paymentMode?: 'PREPAID' | 'POSTPAID' | null;
  cycle?: 'WEEKLY' | 'MONTHLY' | null;
  billToDefault?: 'OEM' | 'DEALER' | null;
  contactEmail?: string | '' | null;
}

export interface OemCsvBody {
  oemCode?: string | null;
}

export interface OemOrderRequest {
  oemOrderRef: string;
  dealerCode: string;
  regnNo: string;
  chassisNo: string;
  engineNo: string;
  ownerName?: string | null;
  mobile?: string | null;
}

export interface OemPushBody {
  oemCode?: string | null;
  repeatLast?: boolean;
}

/** One row of an OEM vehicle data file (vehicles built and supplied to a dealer). */
export interface OemVehicleRecord {
  chassisNo: string;
  engineNo: string;
  model: string;
  vahanCategory?: string | null;
  dealerCode: string;
  invoiceNo?: string | null;
  invoiceDate?: string | null;
}

export interface OtpRequest {
  purpose: 'ORDER_CONFIRM' | 'STATUS' | 'SUPPORT';
  mobile?: string | null;
  regnNo?: string | null;
  chassisLast5?: string | null;
  ticketNo?: string | null;
}

export interface OtpVerify {
  otpRef: string;
  code: string;
}

export interface PairBody {
  billTo: 'OEM' | 'DEALER';
}

export interface PriceRuleBody {
  stateCode: string;
  vehicleClass: '2W' | '3W' | 'LMV' | 'HMV' | 'TRAILER';
  vehicleType?: 'NON_TRANSPORT' | 'TRANSPORT' | null;
  oemCode?: string | null;
  orderType: 'NEW' | 'OLD' | 'REPLACEMENT';
  plateSet?: 'BOTH' | 'FRONT' | 'REAR';
  amountRupees: number;
  published?: boolean;
  effectiveFrom?: string | null;
}

export interface QcRequest {
  result: 'PASS' | 'REJECT';
  rejectPositions?: Array<'FRONT' | 'REAR'> | null;
  reason?: string | null;
}

export interface RolePermsBody {
  permissions: Array<string>;
}

export interface RuleBody {
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  capacity: number;
}

export interface RunBody {
  oemCode: string;
}

export interface SaveReportBody {
  reportCode: string;
  name: string;
  params: Record<string, string>;
}

export interface StickerPrintRequest {
  reprint?: boolean;
  reason?: string | null;
}

export interface SwitchLaserRequest {
  position: 'FRONT' | 'REAR';
  newLaserCode: string;
  reason: string;
}

export interface TemplateBody {
  name: string;
  layout: LayoutBody;
}

export interface TemplatePatchBody {
  body?: string | null;
  subject?: string | null;
  senderId?: string | null;
  dltTemplateId?: string | null;
  active?: boolean | null;
}

export interface TicketReplyRequest {
  message: string;
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | null;
  isPublic?: boolean;
}

export interface TopUpRequest {
  amountRupees: number;
  reference: string;
}

export interface UpdateUserBody {
  displayName?: string | null;
  roles?: Array<string> | null;
  active?: boolean | null;
  password?: string | null;
  orgId?: string | null;
}

export interface VahanModeRequest {
  mode: 'normal' | 'slow' | 'down' | 'not-found';
}

export interface VehicleIdentity {
  regnNo: string;
  chassisNo: string;
  engineNo: string;
}

export interface VehicleSpecBody {
  role: string;
  title: string;
  expected?: string;
  category: '2WN' | 'LMV' | 'LPV' | '3WT' | '2WT';
  inOemFile?: boolean;
  engineMismatch?: boolean | null;
  oem?: 'KRANTI' | 'ZENMO' | null;
}
