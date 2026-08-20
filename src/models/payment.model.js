// src/models/payment.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Payment extends Model {
  static associate(db) {
    Payment.belongsTo(db.User,          { foreignKey: 'user_id',         as: 'user'         });
    Payment.belongsTo(db.Subscription,  { foreignKey: 'subscription_id', as: 'subscription' });
    Payment.belongsTo(db.PaymentStatus, { foreignKey: 'status_id',       as: 'status'       });
  }
}

Payment.init(
  {
    id: {
      type:          DataTypes.BIGINT,
      primaryKey:    true,
      autoIncrement: true,
    },
    user_id:         { type: DataTypes.BIGINT, allowNull: false },
    subscription_id: { type: DataTypes.BIGINT, allowNull: true  },
    status_id:       { type: DataTypes.SMALLINT,        allowNull: false },

    amount:   {
      type:      DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate:  { min: 0 },
    },
    currency: {
      type:         DataTypes.CHAR(3),
      allowNull:    false,
      defaultValue: 'COP',
    },
    payment_provider: {
      type:      DataTypes.STRING(40),
      allowNull: false,
      comment:   'wompi | stripe | paypal',
    },
    external_transaction_id: {
      type:      DataTypes.STRING(180),
      allowNull: true,
    },
    paid_at:  { type: DataTypes.DATE,  allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true, comment: 'Respuesta raw del proveedor' },
  },
  {
    sequelize,
    modelName:  'Payment',
    tableName:  'payments',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
    indexes: [
      { unique: true, fields: ['payment_provider', 'external_transaction_id'] },
    ],
  }
);

module.exports = Payment;