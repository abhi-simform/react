// Public API of the delivery feature (pincode serviceability and ETA).
export { DeliveryCheck } from "./components/DeliveryCheck"
export { PincodeStatus } from "./components/PincodeStatus"
export {
  usePincodeCheck,
  type PincodeCheckState,
} from "./hooks/usePincodeCheck"
export { checkPincode } from "./api"
export { describeEta } from "./format"
export { lookupArea } from "./pincodeAreas"
export type { PincodeCheck, Serviceable } from "./schemas"
