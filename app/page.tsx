"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "./assets/supabaseClient";
import { v4 as uuidv4 } from "uuid";
import { HashLoader, MoonLoader } from "react-spinners";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AVATAR_COUNT = 10;
const AVATAR_API = "https://api.dicebear.com/9.x/big-ears-neutral/svg";
const AVATAR_SEEDS = Array.from({ length: AVATAR_COUNT }, (_, i) => `avatar${i + 1}`);
const AVATAR_URLS = AVATAR_SEEDS.map(seed => `${AVATAR_API}?seed=${seed}`);

function PenIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.06 2.06 0 0 1 2.915 2.915L7.5 18.68l-4 1 1-4 13.362-13.193z" />
    </svg>
  );
}

interface Post {
  id: string;
  author_id: string | null;
  message: string;
  created_at: string;
  display_name?: string | null;
  avatar_url?: string | null;
  image_url?: string | null;
}

export default function Wall() {
  const [message, setMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_URLS[0]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const avatarPickerRef = useRef<HTMLDivElement>(null);

  // Close avatar picker on outside click
  useEffect(() => {
    if (!showAvatarPicker) return;
    function handleClick(e: MouseEvent) {
      if (
        avatarButtonRef.current &&
        avatarPickerRef.current &&
        !avatarButtonRef.current.contains(e.target as Node) &&
        !avatarPickerRef.current.contains(e.target as Node)
      ) {
        setShowAvatarPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAvatarPicker]);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setPosts(data);
      setLoading(false);
    };
    fetchPosts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('realtime:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => {
        if (payload.eventType === 'INSERT') {
          setPosts(prev => [payload.new as Post, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setPosts(prev => prev.filter(p => p.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setPosts(prev => prev.map(p => p.id === payload.new.id ? payload.new as Post : p));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Only image files are allowed.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be less than 5MB.");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // Handle post submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || message.length > 280) return;
    setPosting(true);
    setUploading(true);
    let image_url = null;
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `user_uploads/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, imageFile, { upsert: false });
      if (uploadError) {
        alert("Image upload failed: " + uploadError.message);
      } else {
        const { data } = supabase.storage.from('post-images').getPublicUrl(filePath);
        image_url = data.publicUrl;
      }
    }
    setUploading(false);
    await supabase.from("posts").insert([
      {
        author_id: "anon", // Placeholder, no login
        message: message.trim(),
        display_name: displayName.trim() || "guest",
        avatar_url: avatarUrl,
        image_url,
      },
    ]);
    setMessage("");
    setImageFile(null);
    setImagePreview(null);
    setPosting(false);
    inputRef.current?.focus();
    toast.success("Post shared successfully!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col items-center py-6 px-2">
      <div className="w-full rounded-xl p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left: Profile Card */}
        <aside className="md:col-span-2 flex flex-col items-center gap-4 bg-white rounded-xl p-4">
          <div className="relative flex flex-col items-center gap-2 w-full">
            <button
              type="button"
              ref={avatarButtonRef}
              className="relative group focus:outline-none"
              onClick={() => setShowAvatarPicker(v => !v)}
              aria-label="Change avatar"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt="Current avatar"
                className="w-40 h-40 rounded-xl bg-gray-100 border-2 border-blue-300 object-cover shadow-md transition-all"
              />
              <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="flex items-center gap-1 text-white text-base font-medium">
                  <PenIcon className="w-5 h-5" /> Change avatar
                </span>
              </div>
            </button>
            {showAvatarPicker && (
              <div ref={avatarPickerRef} className="absolute z-20 top-44 left-1/2 -translate-x-1/2 bg-white border border-blue-200 rounded-xl shadow-lg p-3 flex flex-wrap gap-2 w-72 animate-fade-in">
                {AVATAR_URLS.map((url, idx) => (
                  <button
                    type="button"
                    key={url}
                    className={`rounded-full border-2 p-0.5 transition-all ${avatarUrl === url ? 'border-blue-500 ring-2 ring-blue-300' : 'border-transparent'}`}
                    onClick={() => {
                      setAvatarUrl(url);
                      setShowAvatarPicker(false);
                    }}
                    aria-label={`Select avatar ${idx + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Avatar ${idx + 1}`}
                      className="w-10 h-10 rounded-full bg-gray-100"
                    />
                  </button>
                ))}
              </div>
            )}
        </div>
          <input
            type="text"
            className="border rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-full text-black placeholder-gray-300"
            maxLength={32}
            placeholder="Display name (optional)"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            disabled={posting}
          />
        </aside>
        {/* Right: Wall Form and Feed */}
        <main className="md:col-span-10 flex flex-col gap-6 bg-white rounded-xl p-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <textarea
              ref={inputRef}
              className="resize-none border rounded-lg p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[60px] max-h-[120px] bg-white text-black placeholder-gray-300"
              maxLength={280}
              placeholder="What's on your mind? (max 280 chars)"
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              disabled={posting}
            />
            <div className="flex flex-col gap-2">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white cursor-pointer hover:border-blue-400 transition">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={posting || uploading}
                />
                {imagePreview ? (
                  <div className="relative w-full flex flex-col items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="max-h-40 rounded-lg object-contain" />
                    <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full px-2 py-1 text-xs text-red-500 border border-red-200 hover:bg-red-100">Remove</button>
                  </div>
                ) : (
                  <>
                    <span className="text-gray-500 text-sm flex flex-col items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12M7 16l-4 4m0 0l4-4m-4 4h18" /></svg>
                      Click to add photo (optional)
                    </span>
                    <span className="text-xs text-gray-400">JPG, PNG, GIF up to 5MB</span>
                  </>
                )}
              </label>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-xs ${message.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>{message.length}/280</span>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                disabled={!message.trim() || message.length > 280 || posting || uploading}
              >
                {posting || uploading ? (
                  <>
                    Sharing... <MoonLoader size={18} color="#fff" />
                  </>
                ) : 'Share'}
              </button>
            </div>
          </form>
          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold mb-3 text-gray-700">Live Feed</h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <HashLoader color="#3b82f6" size={48} />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No posts yet. Be the first!</div>
            ) : (
              <ul className="flex flex-col gap-4">
                {posts.map(post => (
                  <li key={post.id} className="bg-blue-50 border border-blue-100 rounded-lg p-4 shadow-sm flex gap-3 items-start">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.avatar_url || AVATAR_URLS[0]}
                      alt="Avatar"
                      className="w-12 h-12 rounded-full bg-gray-100 border border-blue-200 object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-blue-700">{post.display_name || "guest"}</span>
                        <span className="text-xs text-gray-400">{new Date(post.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-gray-800 whitespace-pre-line break-words">{post.message}</div>
                      {post.image_url && (
                        <div className="mt-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={post.image_url} alt="Post attachment" className="max-h-60 rounded-lg border border-gray-200 object-contain" />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}
