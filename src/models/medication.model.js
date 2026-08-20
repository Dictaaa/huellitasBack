const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Medication extends Model {
  static associate(db) {
    Medication.belongsTo(db.Pet,           { foreignKey: 'pet_id',            as: 'pet'    });
    Medication.belongsTo(db.MedicalRecord, { foreignKey: 'medical_record_id', as: 'record' });
  }
}

Medication.init(
  {
    id:                { type: DataTypes.BIGINT,      primaryKey: true, autoIncrement: true },
    pet_id:            { type: DataTypes.BIGINT,      allowNull: false },
    medical_record_id: { type: DataTypes.BIGINT,      allowNull: true  },
    name:              { type: DataTypes.STRING(120),  allowNull: false },
    dosage:            { type: DataTypes.STRING(60),   allowNull: true  },
    frequency:         { type: DataTypes.STRING(60),   allowNull: true  },
    start_date:        { type: DataTypes.DATEONLY,     allowNull: true  },
    end_date:          { type: DataTypes.DATEONLY,     allowNull: true  },
    notes:             { type: DataTypes.TEXT,         allowNull: true  },
    active:            { type: DataTypes.BOOLEAN,      allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    modelName:  'Medication',
    tableName:  'medications',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  false,
  }
);

module.exports = Medication;