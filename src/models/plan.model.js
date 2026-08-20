// src/models/plan.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Plan extends Model {
  static associate(db) {
    Plan.hasMany(db.Subscription, { foreignKey: 'plan_id', as: 'subscriptions' });
  }

  hasFeature(key) {
    return this.features?.[key] === true;
  }

  // Calcula fecha de vencimiento según el período
  getEndDate(startDate = new Date()) {
    const d = new Date(startDate);
    if (this.billing_period === 'monthly') d.setMonth(d.getMonth() + 1);
    if (this.billing_period === 'yearly')  d.setFullYear(d.getFullYear() + 1);
    return d;
  }

  // Slug base sin el sufijo -mensual / -anual
  getPlanFamily() {
    return this.slug.replace(/-mensual$|-anual$/, '');
  }

  isMonthly() { return this.billing_period === 'monthly'; }
  isYearly()  { return this.billing_period === 'yearly';  }
}

Plan.init(
  {
    id: {
      type:          DataTypes.BIGINT,
      primaryKey:    true,
      autoIncrement: true,
    },
    name: {
      type:      DataTypes.STRING(80),
      allowNull: false,
    },
    slug: {
      type:      DataTypes.STRING(80),
      allowNull: false,
      unique:    true,
    },
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate:  { min: 0 },
    },
    currency: {
      type:         DataTypes.CHAR(3),
      allowNull:    false,
      defaultValue: 'COP',
    },
    billing_period: {
      type:         DataTypes.ENUM('monthly', 'yearly', 'one_time'),
      allowNull:    false,
      defaultValue: 'monthly',
    },
    max_pets: {
      type:         DataTypes.SMALLINT,
      allowNull:    false,
      defaultValue: 1,
      validate:     { min: 1 },
    },
    features: {
      type:         DataTypes.JSONB,
      allowNull:    true,
      defaultValue: {},
    },
    active: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName:  'Plan',
    tableName:  'plans',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
    scopes: {
      active:   { where: { active: true } },
      monthly:  { where: { billing_period: 'monthly', active: true } },
      yearly:   { where: { billing_period: 'yearly',  active: true } },
    },
  }
);

module.exports = Plan;