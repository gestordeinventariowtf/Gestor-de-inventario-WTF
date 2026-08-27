export const demoProducts = [
  {
    id: "pos_camarofongo",
    sku: "ICG-100",
    barcode: "100",
    name: "Camarofongo",
    categoryId: "mofongos",
    categoryName: "Mofongos",
    price: 750,
    active: true
  },
  {
    id: "pos_wtf_burger",
    sku: "ICG-101",
    barcode: "101",
    name: "WTF Burger",
    categoryId: "burgers",
    categoryName: "Hamburguesas",
    price: 450,
    active: true
  },
  {
    id: "pos_limonada",
    sku: "ICG-102",
    barcode: "102",
    name: "Limonada",
    categoryId: "bebidas",
    categoryName: "Bebidas",
    price: 120,
    active: true
  },
  {
    id: "pos_sin_mapa",
    sku: "ICG-999",
    barcode: "999",
    name: "Producto sin puente",
    categoryId: "revision",
    categoryName: "Revision",
    price: 100,
    active: true
  }
];

export const demoInventoryBridges = [
  {
    bridgeId: "bridge_bechamel",
    posProductId: "pos_camarofongo",
    wtfProductId: "wtf_bechamel",
    wtfProductName: "Bechamel",
    wtfArea: "cocina",
    wtfLocation: "mise",
    qtyPerSale: 120,
    sourceUnit: "G",
    targetUnit: "G"
  },
  {
    bridgeId: "bridge_camarones",
    posProductId: "pos_camarofongo",
    wtfProductId: "wtf_camarones",
    wtfProductName: "Camarones",
    wtfArea: "cocina",
    wtfLocation: "cuarto_frio",
    qtyPerSale: 0.5,
    sourceUnit: "Lb",
    targetUnit: "G"
  },
  {
    bridgeId: "bridge_pan",
    posProductId: "pos_wtf_burger",
    wtfProductId: "wtf_pan_burger",
    wtfProductName: "Pan Burger",
    wtfArea: "cocina",
    wtfLocation: "inventario",
    qtyPerSale: 1,
    sourceUnit: "Uni",
    targetUnit: "Uni"
  },
  {
    bridgeId: "bridge_carne",
    posProductId: "pos_wtf_burger",
    wtfProductId: "wtf_carne_burger",
    wtfProductName: "Carne Burger",
    wtfArea: "cocina",
    wtfLocation: "mise",
    qtyPerSale: 1,
    sourceUnit: "Uni",
    targetUnit: "Uni"
  }
];

export const demoZones = [
  { zoneId: "zone_salon", name: "Salon principal", active: true },
  { zoneId: "zone_terraza", name: "Terraza", active: true },
  { zoneId: "zone_delivery", name: "Delivery", active: true }
];

export const demoTables = [
  { tableId: "mesa_1", label: "Mesa 1", zoneId: "zone_salon", zoneName: "Salon principal", seats: 4 },
  { tableId: "mesa_2", label: "Mesa 2", zoneId: "zone_salon", zoneName: "Salon principal", seats: 4 },
  { tableId: "mesa_3", label: "Mesa 3", zoneId: "zone_salon", zoneName: "Salon principal", seats: 6 },
  { tableId: "terraza_1", label: "Terraza 1", zoneId: "zone_terraza", zoneName: "Terraza", seats: 4 },
  { tableId: "terraza_2", label: "Terraza 2", zoneId: "zone_terraza", zoneName: "Terraza", seats: 4 }
];

export const demoPosConfiguration = {
  discounts: {
    enabled: true,
    roleLimits: {
      admin: { maxPercent: 100, requiresReason: true },
      cashier: { maxPercent: 10, requiresReason: true }
    },
    promotions: [
      {
        promotionId: "promo_limonada_10",
        name: "10% Limonada",
        type: "percent",
        value: 10,
        productIds: ["pos_limonada"],
        active: true
      }
    ]
  },
  hardwareProfiles: [
    {
      hardwareProfileId: "default",
      name: "Caja virtual segura",
      printer: {
        printerId: "receipt-main",
        name: "Caja principal",
        enabled: true,
        mode: "virtual",
        station: "Caja",
        commandSet: "escpos",
        retry: true
      },
      payment: {
        providerId: "cash-virtual",
        name: "Efectivo virtual",
        enabled: true,
        mode: "virtual",
        provider: "cash",
        retry: true
      }
    },
    {
      hardwareProfileId: "kitchen_counter",
      name: "Caja cocina sin impresora",
      printer: {
        printerId: "kitchen-disabled",
        name: "Impresora cocina desactivada",
        enabled: false,
        mode: "virtual",
        station: "Cocina",
        commandSet: "escpos",
        retry: true
      },
      payment: {
        providerId: "cash-kitchen",
        name: "Efectivo cocina",
        enabled: true,
        mode: "virtual",
        provider: "cash",
        retry: true
      }
    }
  ],
  devices: [
    {
      deviceId: "pos_demo",
      name: "POS Demo",
      station: "Caja",
      hardwareProfileId: "default"
    }
  ]
};
