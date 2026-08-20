const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class AdoptionStatus extends Model {
  static associate(db) {
    AdoptionStatus.hasMany(db.AdoptionListing, { foreignKey: 'status_id', as: 'listings' });
  }
}

AdoptionStatus.init(
  {
    id:          { type: DataTypes.SMALLINT,    primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(40),  allowNull: false, unique: true },
    description: { type: DataTypes.STRING(120), allowNull: true  },
  },
  {
    sequelize,
    modelName:  'AdoptionStatus',
    tableName:  'adoption_statuses',
    timestamps: false,
  }
);

module.exports = AdoptionStatus;