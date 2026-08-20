const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class SubscriptionStatus extends Model {
  static associate(db) {
    SubscriptionStatus.hasMany(db.Subscription, { foreignKey: 'status_id', as: 'subscriptions' });
  }
}

SubscriptionStatus.init(
  {
    id:          { type: DataTypes.SMALLINT,    primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(40),  allowNull: false, unique: true },
    description: { type: DataTypes.STRING(120), allowNull: true  },
  },
  {
    sequelize,
    modelName:  'SubscriptionStatus',
    tableName:  'subscription_statuses',
    timestamps: false,
  }
);

module.exports = SubscriptionStatus;