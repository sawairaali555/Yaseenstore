"use client";
import { useEffect, useState } from "react";
import { ImagePlus, LoaderCircle, Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CategoryNode } from "@/lib/categories";

type Draft = {
  id?: string;
  parentId: string | null;
  name: string;
  slug: string;
  image: string;
  enabled: boolean;
  displayOrder: number;
  description: string;
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
};

const blank: Draft = {
  parentId: null,
  name: "",
  slug: "",
  image: "",
  enabled: true,
  displayOrder: 0,
  description: "",
  metaTitle: "",
  metaKeywords: "",
  metaDescription: "",
};

function flatten(nodes: CategoryNode[], result: CategoryNode[] = []) {
  nodes.forEach((node) => {
    result.push(node);
    flatten(node.children, result);
  });
  return result;
}

const imageUrl = (value: string) =>
  !value ? "" : /^https?:\/\//.test(value) ? value : "/images/" + value + ".jpg";

function Tree({
  nodes,
  edit,
  remove,
  viewChildren,
  toggle,
}: {
  nodes: CategoryNode[];
  edit: (node: CategoryNode) => void;
  remove: (node: CategoryNode) => void;
  viewChildren: (node: CategoryNode) => void;
  toggle: (node: CategoryNode) => void;
}) {
  const rows = flatten(nodes).filter((node) => !node.parentId);
  return (
    <div className="category-table-wrap">
      <table className="category-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Slug</th>
            <th>Status</th>
            <th>Sort order</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((node) => (
            <tr key={node.id}>
              <td>{node.parentId ? "— " : ""}{node.name}</td>
              <td>{node.slug}</td>
              <td>
                <span className={node.enabled ? "category-status active" : "category-status"}>
                  {node.enabled ? "Active" : "Inactive"}
                </span>
              </td>
              <td>{node.displayOrder + 1}</td>
              <td>
                <button className="category-subcategories" type="button" onClick={() => viewChildren(node)}>
                  Sub categories ({node.children.length})
                </button>
                <button type="button" className={node.enabled ? "category-toggle active" : "category-toggle"} onClick={() => toggle(node)}>
                  {node.enabled ? "Disable" : "Enable"}
                </button>
                <button type="button" aria-label={`Edit ${node.name}`} onClick={() => edit(node)}>
                  <Pencil size={15} />
                </button>
                <button type="button" aria-label={`Delete ${node.name}`} onClick={() => remove(node)}>
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubcategoryTable({
  parent,
  edit,
  remove,
  addChild,
  toggle,
  close,
}: {
  parent: CategoryNode;
  edit: (node: CategoryNode) => void;
  remove: (node: CategoryNode) => void;
  addChild: (node: CategoryNode) => void;
  toggle: (node: CategoryNode) => void;
  close: () => void;
}) {
  return (
    <section className="admin-card subcategory-card">
      <div className="subcategory-head">
        <div>
          <h2>Sub categories</h2>
          <p>{parent.name}</p>
        </div>
        <div>
          <button type="button" className="admin-secondary" onClick={() => addChild(parent)}>
            <Plus size={15} /> Add subcategory
          </button>
          <button type="button" className="admin-icon" aria-label="Close subcategories" onClick={close}>
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="category-table-wrap">
        <table className="category-table subcategory-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Sort Order</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {parent.children.length ? parent.children.map((node) => (
              <tr key={node.id}>
                <td>{node.name}</td>
                <td>{node.slug}</td>
                <td>
                  <span className={node.enabled ? "category-status active" : "category-status"}>
                    {node.enabled ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>{node.displayOrder}</td>
                <td>
                  <button type="button" className="category-icon-button edit" aria-label={`Edit ${node.name}`} onClick={() => edit(node)}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" className={node.enabled ? "category-toggle active" : "category-toggle"} onClick={() => toggle(node)}>
                    {node.enabled ? "Disable" : "Enable"}
                  </button>
                  <button type="button" className="category-icon-button delete" aria-label={`Delete ${node.name}`} onClick={() => remove(node)}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5}>
                  <div className="subcategory-empty">
                    <p>No subcategories under {parent.name} yet.</p>
                    <button type="button" className="admin-secondary" onClick={() => addChild(parent)}>
                      <Plus size={15} /> Add first subcategory
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Categories({ onChange }: { onChange?: (categories: CategoryNode[]) => void }) {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [draft, setDraft] = useState<Draft>(blank);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const all = flatten(tree);
  const selectedParent = selectedParentId ? all.find((node) => node.id === selectedParentId) || null : null;

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/categories");
      const data: { categories?: CategoryNode[]; error?: string } = await response.json();
      if (!response.ok) throw Error(data.error);
      setTree(data.categories || []);
      onChange?.(data.categories || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew(parentId: string | null = null) {
    setDraft({ ...blank, parentId });
    setMessage("");
    setModalOpen(true);
  }

  function edit(node: CategoryNode) {
    setDraft({
      id: node.id,
      parentId: node.parentId,
      name: node.name,
      slug: node.slug,
      image: node.image || "",
      enabled: node.enabled,
      displayOrder: node.displayOrder,
      description: node.description || "",
      metaTitle: node.metaTitle || "",
      metaKeywords: node.metaKeywords || "",
      metaDescription: node.metaDescription || "",
    });
    setMessage("");
    setModalOpen(true);
  }

  function addChild(node: CategoryNode) {
    openNew(node.id);
    setMessage(`Adding subcategory under ${node.name}.`);
  }

  function viewChildren(node: CategoryNode) {
    setSelectedParentId(node.id);
    setMessage("");
  }

  async function upload(file: File | null) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setMessage("Choose a JPG, PNG or WebP image, up to 3 MB.");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const response = await fetch("/api/media", { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const data: { url?: string; error?: string } = await response.json();
      if (!response.ok) throw Error(data.error || "Upload failed.");
      setDraft((current) => ({ ...current, image: data.url || "" }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", item: { ...draft, slug: draft.slug || draft.name, status: draft.enabled ? "Active" : "Inactive" } }),
      });
      const data: { categories?: CategoryNode[]; error?: string } = await response.json();
      if (!response.ok) throw Error(data.error);
      setTree(data.categories || []);
      onChange?.(data.categories || []);
      setSelectedParentId((current) => current && flatten(data.categories || []).some((node) => node.id === current) ? current : null);
      setDraft(blank);
      setModalOpen(false);
      setMessage("Category saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save category.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(node: CategoryNode) {
    setBusy(true);
    setMessage("");
    try {
      const item = {
        id: node.id,
        parentId: node.parentId,
        name: node.name,
        slug: node.slug,
        image: node.image || "",
        enabled: !node.enabled,
        status: !node.enabled ? "Active" : "Inactive",
        displayOrder: node.displayOrder,
        description: node.description || "",
        metaTitle: node.metaTitle || "",
        metaKeywords: node.metaKeywords || "",
        metaDescription: node.metaDescription || "",
      };
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", item }),
      });
      const data: { categories?: CategoryNode[]; error?: string } = await response.json();
      if (!response.ok) throw Error(data.error);
      setTree(data.categories || []);
      onChange?.(data.categories || []);
      setMessage(`${node.name} ${item.enabled ? "enabled" : "disabled"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update category status.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(node: CategoryNode) {
    if (!window.confirm(`Delete ${node.name} and its subcategories?`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: node.id }),
      });
      const data: { categories?: CategoryNode[]; error?: string } = await response.json();
      if (!response.ok) throw Error(data.error);
      setTree(data.categories || []);
      onChange?.(data.categories || []);
      setSelectedParentId((current) => current === node.id ? null : current);
      setMessage("Category deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete category.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="category-manager">
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Category tree</h2>
            <p>Manage the navigation hierarchy used by your storefront.</p>
          </div>
          <button type="button" className="admin-secondary" onClick={() => openNew()}>
            <Plus size={16} /> New category
          </button>
        </div>
        {message && <p role="status" className="admin-setting-note category-message">{message}</p>}
        {loading ? <p className="category-loading">Loading categories...</p> : tree.length ? <Tree nodes={tree} edit={edit} remove={remove} viewChildren={viewChildren} toggle={toggle} /> : <p className="admin-empty">No categories yet.</p>}
      </section>
      {selectedParent && (
        <SubcategoryTable parent={selectedParent} edit={edit} remove={remove} addChild={addChild} toggle={toggle} close={() => setSelectedParentId(null)} />
      )}

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!busy && !uploading) setModalOpen(open); }}>
        <DialogContent className="category-dialog" showCloseButton>
          <DialogHeader className="category-dialog-head">
            <DialogTitle>{draft.id ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="category-dialog-form">
            <div className="category-dialog-grid">
              <label>
                English Name <em>*</em>
                <input required minLength={2} maxLength={80} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </label>
              <label>
                Status
                <select value={draft.enabled ? "Active" : "Inactive"} onChange={(event) => setDraft({ ...draft, enabled: event.target.value === "Active" })}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
              <label>
                Slug
                <input maxLength={80} value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} placeholder="men-clothing" />
              </label>
              <label>
                Parent category
                <select value={draft.parentId || ""} onChange={(event) => setDraft({ ...draft, parentId: event.target.value || null })}>
                  <option value="">Top-level category</option>
                  {all.filter((node) => node.id !== draft.id).map((node) => (
                    <option key={node.id} value={node.id}>{node.parentId ? "- " : ""}{node.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Meta Title
                <input maxLength={160} value={draft.metaTitle} onChange={(event) => setDraft({ ...draft, metaTitle: event.target.value })} />
              </label>
              <label>
                Sort Order <em>*</em>
                <input type="number" min="0" max="9999" value={draft.displayOrder} onChange={(event) => setDraft({ ...draft, displayOrder: Number(event.target.value) })} />
              </label>
            </div>
            <label className="category-wide">
              Meta Keywords
              <textarea maxLength={1000} value={draft.metaKeywords} onChange={(event) => setDraft({ ...draft, metaKeywords: event.target.value })} />
            </label>
            <label className="category-wide">
              Meta Description
              <textarea maxLength={320} value={draft.metaDescription} onChange={(event) => setDraft({ ...draft, metaDescription: event.target.value })} />
            </label>
            <label className="category-wide">
              Description
              <textarea maxLength={400} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </label>
            <div className="category-image-editor">
              <div>
                {draft.image ? <img src={imageUrl(draft.image)} alt={draft.name || "Category"} /> : <ImagePlus size={42} />}
                <label>
                  {uploading ? <><LoaderCircle size={14} /> Uploading...</> : <><Upload size={14} /> Change Image</>}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={uploading || busy} onChange={(event) => { upload(event.target.files?.[0] || null); event.currentTarget.value = ""; }} />
                </label>
              </div>
            </div>
            {message && <p role="status" className="admin-setting-note">{message}</p>}
            <footer className="category-dialog-actions">
              <button type="button" className="admin-secondary" disabled={busy || uploading} onClick={() => setModalOpen(false)}>
                Close
              </button>
              <button className="admin-primary" disabled={busy || uploading}>
                <Save size={16} /> {busy ? "Saving..." : draft.id ? "Update" : "Save"}
              </button>
            </footer>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
