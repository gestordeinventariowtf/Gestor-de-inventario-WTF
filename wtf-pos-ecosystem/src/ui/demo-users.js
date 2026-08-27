import { createPosUser, POS_PERMISSIONS } from "../domain/pos-user.js";

export const demoUsers = [
  createPosUser({
    userId: "user_admin",
    name: "Administrador",
    role: "admin",
    pin: "1234",
    permissions: Object.values(POS_PERMISSIONS)
  }),
  createPosUser({
    userId: "user_cashier",
    name: "Caja Demo",
    role: "cashier",
    pin: "2222",
    permissions: [
      POS_PERMISSIONS.OPEN_SHIFT,
      POS_PERMISSIONS.SELL,
      POS_PERMISSIONS.SEND_KDS,
      POS_PERMISSIONS.PRINT_RECEIPT
    ]
  })
];
