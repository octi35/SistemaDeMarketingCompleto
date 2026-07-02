import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Isolate the JSON store in a temp dir before importing the module under test.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "adteam-store-"));
beforeAll(() => {
  process.chdir(tmp);
});

describe("serverStore projects", () => {
  it("saves, lists, loads and deletes a project", async () => {
    const { saveProject, listProjects, getProject, deleteProject } = await import("./serverStore");
    const created = saveProject({ name: "Test", platform: "Instagram", slides: [{ title: "s1" }] });
    expect(created.id).toMatch(/^proj_/);

    const listed = listProjects();
    expect(listed.some((p) => p.id === created.id)).toBe(true);
    expect((listed.find((p) => p.id === created.id) as any).slideCount).toBe(1);

    const updated = saveProject({ id: created.id, name: "Renombrado", slides: [{ title: "s1" }, { title: "s2" }] });
    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe("Renombrado");
    expect(getProject(created.id)?.slides).toHaveLength(2);

    expect(deleteProject(created.id)).toBe(true);
    expect(getProject(created.id)).toBeNull();
  });
});

describe("serverStore scheduled posts", () => {
  it("adds, lists (without payload), cancels and marks scheduled posts", async () => {
    const { addScheduled, listScheduled, cancelScheduled, getDuePending, markScheduled } = await import("./serverStore");

    const post = addScheduled({
      network: "facebook",
      payload: { pageId: "1", token: "secret_abc" },
      publishAt: "2000-01-01T00:00:00.000Z",
      label: "test",
    });
    expect(post.status).toBe("pending");

    // listScheduled never exposes the payload (tokens live there)
    const listed = listScheduled();
    const item = listed.find((s: any) => s.id === post.id) as any;
    expect(item).toBeDefined();
    expect(item.payload).toBeUndefined();

    // due filter picks it up (publishAt is in the past)
    const due = getDuePending(new Date().toISOString());
    expect(due.some((d) => d.id === post.id)).toBe(true);

    markScheduled(post.id, { status: "published", resultId: "fb_1" });
    expect(getDuePending(new Date().toISOString()).some((d) => d.id === post.id)).toBe(false);

    // cancel only works while pending
    expect(cancelScheduled(post.id)).toBe(false);

    const post2 = addScheduled({
      network: "instagram",
      payload: { igAccountId: "2" },
      publishAt: "2099-01-01T00:00:00.000Z",
    });
    expect(cancelScheduled(post2.id)).toBe(true);
    expect(getDuePending("2100-01-01T00:00:00.000Z").some((d) => d.id === post2.id)).toBe(false);
  });

  it("keeps only the latest 200 published posts", async () => {
    const { savePost, listPosts } = await import("./serverStore");
    for (let i = 0; i < 205; i++) {
      savePost({ network: "facebook", postId: `p${i}` });
    }
    expect(listPosts().length).toBeLessThanOrEqual(200);
  });
});
