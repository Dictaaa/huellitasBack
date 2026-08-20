// src/models/adoption-listing.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class AdoptionListing extends Model {
  static associate(db) {
    AdoptionListing.belongsTo(db.Organization,   { foreignKey: 'organization_id', as: 'organization' });
    AdoptionListing.belongsTo(db.User,           { foreignKey: 'listed_by',       as: 'listedBy'     });
    AdoptionListing.belongsTo(db.Pet,            { foreignKey: 'pet_id',          as: 'pet'          });
    AdoptionListing.belongsTo(db.Species,        { foreignKey: 'species_id',      as: 'species'      });
    AdoptionListing.belongsTo(db.AdoptionStatus, { foreignKey: 'status_id',       as: 'status'       });
    // ✅ Breed quitado — no tiene belongsTo recíproco declarado
    AdoptionListing.hasMany(db.AdoptionApplication, { foreignKey: 'listing_id', as: 'applications' });
  }
}

AdoptionListing.init(
  {
    id:              { type: DataTypes.BIGINT,   primaryKey: true, autoIncrement: true },
    organization_id: { type: DataTypes.BIGINT,   allowNull: true  },
    listed_by:       { type: DataTypes.BIGINT,   allowNull: false },
    pet_id:          { type: DataTypes.BIGINT,   allowNull: true  },
    species_id:      { type: DataTypes.SMALLINT, allowNull: true  },
    breed_id:        { type: DataTypes.INTEGER,  allowNull: true  },

    pet_name:        { type: DataTypes.STRING(80),  allowNull: true },
    pet_sex:         { type: DataTypes.ENUM('male','female','unknown'), allowNull: true },
    pet_age_months:  { type: DataTypes.SMALLINT,    allowNull: true },
    pet_description: { type: DataTypes.TEXT,        allowNull: true },
    photo_urls:      { type: DataTypes.JSONB,       allowNull: true },

    vaccinated:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    sterilized:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    city:        { type: DataTypes.STRING(80), allowNull: true },
    status_id:   { type: DataTypes.SMALLINT,   allowNull: false },

    published_at: { type: DataTypes.DATE, allowNull: true },
    closed_at:    { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName:  'AdoptionListing',
    tableName:  'adoption_listings',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
  }
);

module.exports = AdoptionListing;