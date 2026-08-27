import { fileURLToPath } from "node:url";
import { createCart, addProduct } from "./domain/cart.js";
import { openShift } from "./domain/shift.js";
import { closeCashSale } from "./domain/sales.js";
import { renderReceipt } from "./domain/receipt.js";
import { LocalJsonStore } from "./infrastructure/local-store.js";

const product = {
  id: "prod_wtf_burger",
  sku: "WTF-001",
  barcode: "100001",
  name: "WTF Burger",
  price: 450,
  active: true
};

const shift = openShift({
  employeeId: "employee_demo",
  deviceId: "device_demo",
  openingCash: 5000
});

let cart = createCart({ diningOption: "dineIn" });
cart = addProduct(cart, product, { qty: 1 });

const { sale, event } = closeCashSale({
  cart,
  shift,
  cashReceived: 700
});

const store = new LocalJsonStore(fileURLToPath(new URL("../data/demo-store.json", import.meta.url)));
await store.appendShift(shift);
await store.appendSaleWithEvent(sale, event);

console.log(renderReceipt(sale));
