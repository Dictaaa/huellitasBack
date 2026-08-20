// src/models/pet.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Pet extends Model {
  // ── Helpers ───────────────────────────────────────────
  getAgeInMonths() {
    if (!this.birth_date) return null;
    const now   = new Date();
    const birth = new Date(this.birth_date);
    return (now.getFullYear() - birth.getFullYear()) * 12 +
           (now.getMonth()   - birth.getMonth());
  }

  getAgeLabel() {
    const months = this.getAgeInMonths();
    if (months === null) return null;
    if (months < 12) return `${months} meses`;
    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? 'año' : 'años'}`;
  }

  isLost() {
    return this.status_id === 2;
  }

  // ── Asociaciones ──────────────────────────────────────
  static associate(db) {
    Pet.belongsTo(db.User,         { foreignKey: 'owner_user_id',  as: 'owner'        });
    Pet.belongsTo(db.Subscription, { foreignKey: 'subscription_id',as: 'subscription' });
    Pet.belongsTo(db.Species,      { foreignKey: 'species_id',     as: 'species'      });
    Pet.belongsTo(db.Breed,        { foreignKey: 'breed_id',       as: 'breed'        });
    Pet.belongsTo(db.PetStatus,    { foreignKey: 'status_id',      as: 'status'       });

    Pet.hasOne(db.PetTag,            { foreignKey: 'pet_id', as: 'tag'            });
    Pet.hasOne(db.PetPrivacySetting, { foreignKey: 'pet_id', as: 'privacySettings'});

    Pet.hasMany(db.PetTagHistory,    { foreignKey: 'pet_id', as: 'tagHistory'     });
    Pet.hasMany(db.PetTagScan,       { foreignKey: 'pet_id', as: 'scans'          });
    Pet.hasMany(db.LostPetReport,    { foreignKey: 'pet_id', as: 'lostReports'    });
    Pet.hasMany(db.MedicalRecord,    { foreignKey: 'pet_id', as: 'medicalRecords' });
    Pet.hasMany(db.Vaccination,      { foreignKey: 'pet_id', as: 'vaccinations'   });
    Pet.hasMany(db.Deworming,        { foreignKey: 'pet_id', as: 'dewormings'     });
    Pet.hasMany(db.Medication,       { foreignKey: 'pet_id', as: 'medications'    });
    Pet.hasMany(db.MedicalAlert,     { foreignKey: 'pet_id', as: 'medicalAlerts'  });
    Pet.hasMany(db.PetWeight,        { foreignKey: 'pet_id', as: 'weightHistory'  });
    Pet.hasMany(db.MedicalDocument,  { foreignKey: 'pet_id', as: 'documents'      });
    Pet.hasMany(db.Appointment,      { foreignKey: 'pet_id', as: 'appointments'   });
    Pet.hasMany(db.Reminder,         { foreignKey: 'pet_id', as: 'reminders'      });
    Pet.hasMany(db.PetClinicAccess,  { foreignKey: 'pet_id', as: 'clinicAccesses' });
  }
}

Pet.init(
  {
    id: {
      type:          DataTypes.BIGINT,
      primaryKey:    true,
      autoIncrement: true,
    },
    owner_user_id:   { type: DataTypes.BIGINT,  allowNull: false },
    subscription_id: { type: DataTypes.BIGINT,  allowNull: false },
    species_id:      { type: DataTypes.SMALLINT,allowNull: false },
    breed_id:        { type: DataTypes.INTEGER, allowNull: true  },
    status_id:       { type: DataTypes.SMALLINT,         allowNull: false, defaultValue: 1 },

    name: {
      type:      DataTypes.STRING(80),
      allowNull: false,
      validate:  { len: [1, 80] },
    },
    sex: {
      type:         DataTypes.ENUM('male', 'female', 'unknown'),
      allowNull:    false,
      defaultValue: 'unknown',
    },
    birth_date:           { type: DataTypes.DATEONLY, allowNull: true },
    color:                { type: DataTypes.STRING(60),  allowNull: true },
    weight:               { type: DataTypes.DECIMAL(5,2),allowNull: true },
    weight_unit:          {
      type:         DataTypes.ENUM('kg', 'lb'),
      allowNull:    false,
      defaultValue: 'kg',
    },
    microchip_number:     { type: DataTypes.STRING(60), allowNull: true, unique: true },
    identification_number:{ type: DataTypes.STRING(60), allowNull: true },
    photo_url:            { type: DataTypes.TEXT,       allowNull: true },
    notes:                { type: DataTypes.TEXT,       allowNull: true },

    active:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    deleted_at: { type: DataTypes.DATE,    allowNull: true  },
    created_by: { type: DataTypes.BIGINT, allowNull: true },
    updated_by: { type: DataTypes.BIGINT, allowNull: true },
  },
  {
    sequelize,
    modelName:  'Pet',
    tableName:  'pets',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
    scopes: {
      active:   { where: { active: true, deleted_at: null } },
      withOwner:{ include: [{ association: 'owner' }] },
    },
  }
);

module.exports = Pet;