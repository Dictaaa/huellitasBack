const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class PaymentStatus extends Model {
  static associate(db) {
    PaymentStatus.hasMany(db.Payment, { foreignKey: 'status_id', as: 'payments' });
  }
}

PaymentStatus.init(
  {
    id:          { type: DataTypes.SMALLINT,    primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(40),  allowNull: false, unique: true },
    description: { type: DataTypes.STRING(120), allowNull: true  },
  },
  {
    sequelize,
    modelName:  'PaymentStatus',
    tableName:  'payment_statuses',
    timestamps: false,
  }
);

module.exports = PaymentStatus;