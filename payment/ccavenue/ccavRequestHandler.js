import crypto from "crypto";
import { encrypt } from "./ccavutil.js";

// live
const workingKey = "242144CFEA6B4926EBFDFDCE294ED69C";
const accessCode = "AVUZ83MI69AP36ZUPA";
// local
// const workingKey = "383D6B935E7CCC33899D67DB2B3E2838";
// const accessCode = "ATNG06MJ59AB37GNBA";
// ip
// const workingKey = "12BC2D2A85C6368DC0F7B5B6F043DA11";
// const accessCode = "ATOG06MJ59AB38GOBA";

/**
 * Generate CCAvenue HTML form for payment
 * @param {Object} data - The payment parameters (order_id, amount, currency, etc.)
 * @returns {string} - HTML form string to auto-submit
 */
export function generateCCAPaymentForm(data) {
  const bodyString = Object.keys(data)
    .map((key) => `${key}=${data[key]}`)
    .join("&");

  const md5 = crypto.createHash("md5").update(workingKey).digest();
  const keyBase64 = Buffer.from(md5).toString("base64");

  const ivBase64 = Buffer.from([
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    0x0c, 0x0d, 0x0e, 0x0f,
  ]).toString("base64");

  const encRequest = encrypt(bodyString, keyBase64, ivBase64);

  return `
    <form id="nonseamless" method="post" name="redirect" action="https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction">
      <input type="hidden" name="encRequest" value="${encRequest}">
      <input type="hidden" name="access_code" value="${accessCode}">
      <script language="javascript">document.redirect.submit();</script>
    </form>
  `;
}
