import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { LibrarySearch } from "../features/projectLibrary/LibrarySearch";
import { ProjectItem } from "../features/projectLibrary/ProjectItem";
import { providers, sorts, statuses } from "../features/projectLibrary/presentation";
import { useProjectLibrary } from "../features/projectLibrary/useProjectLibrary";
import "../features/projectLibrary/library.css";

export function ProjectsPage() {
  const library = useProjectLibrary();
  const { query, projects } = library;
  const busy = library.searching || query.isFetching;
  return <div className="project-library">
    <header className="library-heading">
      <div><p className="library-eyebrow">YOUR WORKSPACE</p><h2>Projects</h2><p>Find your story. Pick up where you left off.</p></div>
      <Link to="/videos/new" className="library-new"><span aria-hidden="true">＋</span> New Video</Link>
    </header>
    <section className="library-controls" aria-label="Find projects">
      <LibrarySearch value={library.q} onChange={value => library.update("q", value)} />
      <div className="library-filter-fields">
        <label>Provider<Select value={library.provider ?? "all"} onChange={event => library.update("provider", event.target.value)}>
          <option value="all">All providers</option>{providers.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select></label>
        <label>Status<Select value={library.status ?? "all"} onChange={event => library.update("status", event.target.value)}>
          <option value="all">All statuses</option>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select></label>
        <label>Pause state<Select value={library.paused === undefined ? "all" : library.paused ? "paused" : "active"} onChange={event => library.update("paused", event.target.value === "paused" ? "true" : event.target.value === "active" ? "false" : "all")}>
          <option value="all">Any pause state</option><option value="paused">Paused</option><option value="active">Not paused</option>
        </Select></label>
      </div>
    </section>
    <div className="library-toolbar">
      <div className="library-result-count" role="status" aria-live="polite">
        {library.searching ? "Searching projects…" : query.isPending ? "Loading projects…" : query.isRefetching ? "Refreshing projects…" : query.isError && !query.data ? "Library unavailable" :
          `${projects.length} ${projects.length === 1 ? "project" : "projects"}${query.hasNextPage ? " loaded" : ""}`}
        {library.filtered && <button type="button" onClick={library.clearFilters}>Clear filters</button>}
      </div>
      <div className="library-display-controls">
        <label className="library-sort"><span>Sort by</span><Select aria-label="Sort by" value={library.sort} onChange={event => library.update("sort", event.target.value)}>
          {sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select></label>
        <div className="library-view-toggle" role="group" aria-label="Project view">
          <button type="button" aria-label="List view" aria-pressed={library.view === "list"} onClick={() => library.update("view", "list")}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5h10M7 10h10M7 15h10M3 5h.1M3 10h.1M3 15h.1"/></svg></button>
          <button type="button" aria-label="Grid view" aria-pressed={library.view === "grid"} onClick={() => library.update("view", "grid")}><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="12" y="3" width="5" height="5" rx="1"/><rect x="3" y="12" width="5" height="5" rx="1"/><rect x="12" y="12" width="5" height="5" rx="1"/></svg></button>
        </div>
        <button type="button" className="library-refresh" disabled={busy} onClick={() => void library.refresh()} aria-label="Refresh"><span aria-hidden="true">↻</span><span>Refresh</span></button>
      </div>
    </div>
    {query.isPending && <div className="library-skeleton" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <div key={i}><span/><span/><span/></div>)}</div>}
    {query.isError && !query.data && <section className="library-empty" role="alert"><div className="library-empty-icon">!</div><h3>Could not load projects</h3><p>{query.error.message}</p><Button variant="secondary" onClick={() => void query.refetch()}>Try again</Button></section>}
    {query.data && query.isError && <div className="library-error" role="alert"><strong>{query.isFetchNextPageError ? "Could not load more projects" : "Could not refresh projects"}</strong><span>{query.error.message}</span>{!query.isFetchNextPageError && <Button variant="secondary" onClick={() => void library.refresh()}>Try again</Button>}</div>}
    {query.isSuccess && !library.searching && projects.length === 0 && <section className="library-empty">
      <div className="library-empty-icon" aria-hidden="true">{library.filtered ? "⌕" : "▷"}</div>
      <h3>{library.filtered ? "No projects found" : "Create your first AI video"}</h3>
      <p>{library.filtered ? "Try another title, topic, or project ID, or clear your filters." : "Describe an idea, review the storyboard, and bring your next story to life."}</p>
      {library.filtered ? <Button variant="secondary" onClick={library.clearFilters}>Clear filters</Button> : <Link className="library-new" to="/videos/new">New Video</Link>}
    </section>}
    {projects.length > 0 && <p className="library-freshness">Refresh to see the latest production and review progress.</p>}
    {projects.length > 0 && <section className={`library-results library-${library.view}`} aria-label="Project results" aria-busy={busy}>
      {library.view === "list" && <div className="library-column-headings" aria-hidden="true"><span>Project</span><span>Status</span><span>Provider</span><span>Scenes</span><span>Updated</span><span>Continue</span></div>}
      {projects.map(project => <ProjectItem key={project.id} project={project} onOpen={library.capturePosition} />)}
    </section>}
    {projects.length > 0 && <footer className="library-footer">
      <p>{query.hasNextPage ? "More stories in your library. Load them when you’re ready." : "You’re all caught up."}</p>
      {query.hasNextPage && <Button variant="secondary" disabled={query.isFetching || library.searching} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? "Loading more…" : "Load more"}</Button>}
    </footer>}
  </div>;
}
