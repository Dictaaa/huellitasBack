// src/models/medical-record.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class MedicalRecord extends Model {
  static associate(db) {
    MedicalRecord.belongsTo(db.Pet,          { foreignKey: 'pet_id',          as: 'pet'          });
    MedicalRecord.belongsTo(db.User,         { foreignKey: 'veterinarian_id', as: 'veterinarian' });
    MedicalRecord.belongsTo(db.Organization, { foreignKey: 'clinic_id',       as: 'clinic'       });
    MedicalRecord.hasMany(db.Medication,     { foreignKey: 'medical_record_id',as: 'medications' });
    MedicalRecord.hasMany(db.MedicalDocument,{ foreignKey: 'record_id',        as: 'documents'   });
  }
}

MedicalRecord.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    pet_id:          { type: DataTypes.BIGINT, allowNull: false },
    veterinarian_id: { type: DataTypes.BIGINT, allowNull: true  },
    clinic_id:       { type: DataTypes.BIGINT, allowNull: true  },
    record_date:     { type: DataTypes.DATEONLY,         allowNull: false },
    record_type:     { type: DataTypes.STRING(60),       allowNull: false },
    chief_complaint: { type: DataTypes.TEXT,             allowNull: true  },
    diagnosis:       { type: DataTypes.TEXT,             allowNull: true  },
    treatment:       { type: DataTypes.TEXT,             allowNull: true  },
    notes:           { type: DataTypes.TEXT,             allowNull: true  },
    created_by:      { type: DataTypes.BIGINT,  allowNull: true  },
  },
  {
    sequelize,
    modelName:  'MedicalRecord',
    tableName:  'medical_records',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
  }
);

module.exports = MedicalRecord;