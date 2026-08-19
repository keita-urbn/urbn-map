import { addDoc, collection, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function deleteChatMessage(id: string, collectionName: string = "chat") {
  await deleteDoc(doc(db, collectionName, id));
}

export async function addMessage({
  text,
  authorName,
  uid,
  collectionName = "chat",
}: {
  text: string;
  authorName: string;
  uid?: string;
  collectionName?: string;
}) {
  return await addDoc(collection(db, collectionName), {
    text,
    authorName,
    ...(uid && { uid }),
    createdAt: serverTimestamp(),
  });
}
