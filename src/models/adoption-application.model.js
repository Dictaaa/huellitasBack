const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class AdoptionApplication extends Model {
  static associate(db) {
    AdoptionApplication.belongsTo(db.AdoptionListing, { foreignKey: 'listing_id',   as: 'listing'   });
    AdoptionApplication.belongsTo(db.User,            { foreignKey: 'applicant_id', as: 'applicant' });
  }
}

AdoptionApplication.init(
  {
    id:           { type: DataTypes.BIGINT,  primaryKey: true, autoIncrement: true },
    listing_id:   { type: DataTypes.BIGINT,  allowNull: false },
    applicant_id: { type: DataTypes.BIGINT,  allowNull: false },
    status: {
      type:         DataTypes.ENUM('pending','reviewing','approved','rejected','withdrawn'),
      allowNull:    false,
      defaultValue: 'pending',
    },
    message:     { type: DataTypes.TEXT,   allowNull: true },
    reviewed_at: { type: DataTypes.DATE,   allowNull: true },
    reviewed_by: { type: DataTypes.BIGINT, allowNull: true },
  },
  {
    sequelize,
    modelName:  'AdoptionApplication',
    tableName:  'adoption_applications',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
  }
);

module.exports = AdoptionApplication;