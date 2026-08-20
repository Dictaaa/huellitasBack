// src/models/app-config.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class AppConfig extends Model {

  // ── Helpers estáticos ─────────────────────────────────
  static async get(key) {
    const row = await AppConfig.findByPk(key);
    return row?.value ?? null;
  }

  static async getNumber(key) {
    const val = await AppConfig.get(key);
    return val !== null ? Number(val) : null;
  }

  static async getBool(key) {
    const val = await AppConfig.get(key);
    return val === 'true';
  }

  static async set(key, value) {
    const [row] = await AppConfig.upsert({
      key,
      value:      String(value),
      updated_at: new Date(),
    });
    return row;
  }

  // ── Obtener toda la config de la placa ────────────────
  static async getPlatformConfig() {
    const rows = await AppConfig.findAll();
    const cfg  = {};
    rows.forEach(r => { cfg[r.key] = r.value; });
    return {
      placa: {
        price:         Number(cfg.placa_price        ?? 0),
        currency:              cfg.placa_currency     ?? 'COP',
        description:           cfg.placa_description  ?? '',
        shipping_days: Number(cfg.placa_shipping_days ?? 5),
        enabled:               cfg.placa_enabled === 'true',
      },
    };
  }
}

AppConfig.init(
  {
    key: {
      type:      DataTypes.STRING(80),
      primaryKey:true,
    },
    value: {
      type:      DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type:      DataTypes.STRING(200),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName:  'AppConfig',
    tableName:  'app_config',
    timestamps: false,
    updatedAt:  'updated_at',
  }
);

module.exports = AppConfig;