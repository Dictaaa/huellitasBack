// src/models/organization.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Organization extends Model {
  static associate(db) {
    Organization.hasMany(db.OrganizationUser, { foreignKey: 'organization_id', as: 'members'      });
    Organization.hasMany(db.PetClinicAccess,  { foreignKey: 'organization_id', as: 'petAccesses'  });
    Organization.hasMany(db.Appointment,      { foreignKey: 'organization_id', as: 'appointments' });
    Organization.hasMany(db.MedicalRecord,    { foreignKey: 'clinic_id',       as: 'medicalRecords'});
    Organization.hasMany(db.AdoptionListing,  { foreignKey: 'organization_id', as: 'listings'     });
  }
}

Organization.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name:    { type: DataTypes.STRING(120), allowNull: false },
    slug:    { type: DataTypes.STRING(120), allowNull: false, unique: true },
    type: {
      type:         DataTypes.ENUM('clinic','shelter','rescue','breeder','other'),
      allowNull:    false,
      defaultValue: 'clinic',
    },
    tax_id:      { type: DataTypes.STRING(40),  allowNull: true },
    phone:       { type: DataTypes.STRING(20),  allowNull: true },
    email:       { type: DataTypes.STRING(180), allowNull: true },
    address:     { type: DataTypes.STRING(200), allowNull: true },
    city:        { type: DataTypes.STRING(80),  allowNull: true },
    country_code:{ type: DataTypes.CHAR(2),     allowNull: false, defaultValue: 'CO' },
    active:      { type: DataTypes.BOOLEAN,     allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    modelName:  'Organization',
    tableName:  'organizations',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
  }
);

module.exports = Organization;