// src/models/pet-clinic-access.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class PetClinicAccess extends Model {
  isValid() {
    return (
      this.active &&
      !this.revoked_at &&
      (!this.expires_at || new Date(this.expires_at) > new Date())
    );
  }

  static associate(db) {
    PetClinicAccess.belongsTo(db.Pet,          { foreignKey: 'pet_id',          as: 'pet'          });
    PetClinicAccess.belongsTo(db.Organization, { foreignKey: 'organization_id', as: 'organization' });
    PetClinicAccess.belongsTo(db.User,         { foreignKey: 'granted_by',      as: 'grantedBy'    });
  }
}

PetClinicAccess.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    pet_id:          { type: DataTypes.BIGINT, allowNull: false },
    organization_id: { type: DataTypes.BIGINT, allowNull: false },
    granted_by:      { type: DataTypes.BIGINT, allowNull: false },

    access_medical:   { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    access_vaccines:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  },
    access_documents: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

    granted_at:  { type: DataTypes.DATE,    allowNull: false, defaultValue: DataTypes.NOW },
    expires_at:  { type: DataTypes.DATE,    allowNull: true  },
    revoked_at:  { type: DataTypes.DATE,    allowNull: true  },
    active:      { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    modelName:  'PetClinicAccess',
    tableName:  'pet_clinic_access',
    timestamps: false,
    indexes: [{ unique: true, fields: ['pet_id', 'organization_id'] }],
  }
);

module.exports = PetClinicAccess;