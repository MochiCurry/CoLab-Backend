import { admin } from '../helpers/admin';

const db = admin.firestore();

const categories = [
    { name: "Fitness", slug: "fitness" },
    { name: "Art", slug: "art" },
    { name: "Wellness", slug: "wellness" },
    { name: "Learning", slug: "learning" },
    { name: "Networking", slug: "networking" },
    { name: "Productivity", slug: "productivity" },
    { name: "Music", slug: "music" },
    { name: "Outdoors", slug: "outdoors" },
    { name: "Spirituality", slug: "spirituality" },
    { name: "Finance", slug: "finance" },
    { name: "Entrepreneurship", slug: "entrepreneurship" },
    { name: "Gaming", slug: "gaming" },
    { name: "Writing", slug: "writing" },
    { name: "Film & Video", slug: "film-video" },
    { name: "Cooking", slug: "cooking" },
    { name: "Dance", slug: "dance" },
    { name: "Volunteering", slug: "volunteering" },
    { name: "Public Speaking", slug: "public-speaking" },
    { name: "Design", slug: "design" },
    { name: "Languages", slug: "languages" },
    { name: "Mindfulness", slug: "mindfulness" },
    { name: "Career Growth", slug: "career-growth" },
    { name: "Travel", slug: "travel" },
    { name: "Photography", slug: "photography" },
    { name: "Fashion", slug: "fashion" }
  ];

async function uploadCategories() {
  const batch = db.batch();

  categories.forEach((category) => {
    const docRef = db.collection("categories").doc(category.slug);
    batch.set(docRef, {
      ...category,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log("✅ Categories uploaded");
}

uploadCategories().catch((err) => {
  console.error("❌ Failed to upload:", err);
});
