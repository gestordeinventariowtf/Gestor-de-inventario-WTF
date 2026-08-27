import { authorizeVirtualPayment } from "../domain/payment.js";
import { assertPaymentEnabled } from "../domain/pos-hardware.js";

export class VirtualPaymentAdapter {
  constructor({ approved = true, reason = "DECLINED_BY_SIMULATOR", paymentPolicy = {} } = {}) {
    this.approved = approved;
    this.reason = reason;
    this.paymentPolicy = paymentPolicy;
    this.attempts = [];
  }

  async authorize(request) {
    const policy = assertPaymentEnabled(this.paymentPolicy);
    const attempt = authorizeVirtualPayment(Object.assign({}, request, {
      providerId: policy.providerId,
      provider: policy.provider,
      approved: this.approved,
      reason: this.approved ? "" : this.reason
    }));
    this.attempts.push(attempt);
    return attempt;
  }
}
