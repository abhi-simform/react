// Importing this file registers every job handler. Add a job = add one import here.
import "../utils/email.js" // email.send
import "../modules/products/price.service.js" // price-drop.alert
import "../modules/orders/order.expiry.js" // orders.expire-unpaid (repeating)

export { startJobs, stopJobs, enqueue, drainJobs, jobDriver } from "./queue.js"
