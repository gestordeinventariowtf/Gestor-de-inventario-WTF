import test from "node:test";
import assert from "node:assert/strict";
import { DiningRoom } from "../src/domain/dining-room.js";
import { createOpenTicket } from "../src/domain/open-ticket.js";
import { openShift } from "../src/domain/shift.js";

const zones = [{ zoneId: "zone_salon", name: "Salon" }];
const tables = [
  { tableId: "mesa_1", label: "Mesa 1", zoneId: "zone_salon", zoneName: "Salon" },
  { tableId: "mesa_2", label: "Mesa 2", zoneId: "zone_salon", zoneName: "Salon" }
];

function makeTicket(tableId = "mesa_1", tableLabel = "Mesa 1") {
  const shift = openShift({ employeeId: "emp_dining", deviceId: "pos_dining" });
  return createOpenTicket({ shift, tableId, tableLabel, diningOption: "dineIn" });
}

test("transfiere ticket entre mesas disponibles", () => {
  const room = new DiningRoom({ zones, tables });
  const ticket = makeTicket();
  const { ticket: transferred, event } = room.transferTicket(ticket, "mesa_2", { tickets: [ticket] });

  assert.equal(transferred.tableId, "mesa_2");
  assert.equal(transferred.tableLabel, "Mesa 2");
  assert.equal(transferred.cart.diningOption, "dineIn");
  assert.equal(event.type, "ticket_table_transferred");
});

test("bloquea transferir a una mesa ocupada por otro ticket", () => {
  const room = new DiningRoom({ zones, tables });
  const ticket = makeTicket("mesa_1", "Mesa 1");
  const occupied = Object.assign({}, makeTicket("mesa_2", "Mesa 2"), { ticketId: "ticket_other" });

  assert.throws(() => room.transferTicket(ticket, "mesa_2", { tickets: [occupied] }), /mesa ya tiene/);
});

test("cambiar a llevar limpia mesa y conserva ticket", () => {
  const room = new DiningRoom({ zones, tables });
  const ticket = makeTicket();
  const { ticket: takeOut } = room.changeDiningOption(ticket, "takeOut");

  assert.equal(takeOut.diningOption, "takeOut");
  assert.equal(takeOut.cart.diningOption, "takeOut");
  assert.equal(takeOut.tableId, "");
  assert.equal(takeOut.tableLabel, "");
});
