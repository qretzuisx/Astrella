import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });
import connectDb from '../configs/db.js';
import Gown from '../models/Gown.js';

const guessSilhouette = (name, description) => {
  const text = `${name} ${description || ''}`.toLowerCase();
  
  if (text.includes('mermaid')) return 'Mermaid';
  if (text.includes('trumpet')) return 'Trumpet';
  if (text.includes('ball gown') || text.includes('ballgown')) return 'Ball Gown';
  if (text.includes('a-line') || text.includes('a line')) return 'A-Line';
  if (text.includes('sheath')) return 'Sheath';
  if (text.includes('empire')) return 'Empire';
  if (text.includes('shift')) return 'Shift';
  if (text.includes('wrap')) return 'Wrap';
  if (text.includes('peplum')) return 'Peplum';
  
  return '';
};

const runMigration = async () => {
  try {
    await connectDb();
    console.log("Connected to MongoDB, starting migration...");

    const gowns = await Gown.find({});
    console.log(`Found ${gowns.length} gowns to migrate.`);

    let updatedCount = 0;
    for (const gown of gowns) {
      if (!gown.silhouette) {
        const silhouette = guessSilhouette(gown.name, gown.description);
        if (silhouette) {
          gown.silhouette = silhouette;
          await gown.save();
          console.log(`Updated Gown "${gown.name}" -> Silhouette: ${silhouette}`);
          updatedCount++;
        }
      }
    }

    console.log(`Migration completed successfully. Updated ${updatedCount} gowns.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
