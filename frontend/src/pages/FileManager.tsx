import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listFiles, readFile, writeFile, deleteFilePath, uploadFile } from '../services/api';
import type { FileEntry } from '../services/api';
import { Button } from '../components/Button/Button';
import { Card } from '../components/Card/Card';
import { ConfirmModal } from '../components/ConfirmModal/ConfirmModal';
import { useToast } from '../hooks/useToast';
import styles from './FileManager.module.css';

export function FileManager() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentPath, setCurrentPath] = useState('/data');
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<FileEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: files, isLoading, error, refetch } = useQuery({
    queryKey: ['files', id, currentPath],
    queryFn: () => listFiles(id!, currentPath),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: (path: string) => deleteFilePath(id!, path),
    onSuccess: () => {
      toast('File deleted', 'success');
      refetch();
    },
    onError: () => toast('Failed to delete file', 'error'),
  });

  const writeMutation = useMutation({
    mutationFn: ({ path, content }: { path: string; content: string }) => writeFile(id!, path, content),
    onSuccess: () => {
      toast('File saved', 'success');
      setEditorOpen(false);
      setSelectedFile(null);
      refetch();
    },
    onError: () => toast('Failed to save file', 'error'),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ path, file }: { path: string; file: File }) => uploadFile(id!, path, file),
    onSuccess: () => {
      toast('File uploaded', 'success');
      refetch();
    },
    onError: () => toast('Failed to upload file', 'error'),
  });

  const handleOpenFile = async (entry: FileEntry) => {
    if (entry.isDirectory) {
      setCurrentPath(entry.path);
      return;
    }
    setSelectedFile(entry);
    try {
      const content = await readFile(id!, entry.path);
      setFileContent(content);
      setEditorOpen(true);
    } catch {
      toast('Failed to read file', 'error');
    }
  };

  const handleSaveFile = () => {
    if (!selectedFile) return;
    writeMutation.mutate({ path: selectedFile.path, content: fileContent });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate({ path: currentPath.replace(/\/$/, '') + '/' + file.name, file });
    e.target.value = '';
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean).map((part, i, arr) => {
    const path = '/' + arr.slice(0, i + 1).join('/');
    return { label: part, path };
  });

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(`/servers/${id}`)}>← Back to Server</button>

      <div className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.titlePrefix}>&gt; </span>
          File Manager
        </h1>
      </div>

      {/* Breadcrumbs */}
      <div className={styles.breadcrumbs}>
        <button className={styles.breadcrumbItem} onClick={() => setCurrentPath('/data')}>/data</button>
        {breadcrumbs.map((crumb) => (
          <span key={crumb.path} className={styles.breadcrumbSegment}>
            <span className={styles.breadcrumbSep}>/</span>
            <button className={styles.breadcrumbItem} onClick={() => setCurrentPath(crumb.path)}>
              {crumb.label}
            </button>
          </span>
        ))}
      </div>

      {/* Upload button */}
      <div className={styles.toolbar}>
        <input
          ref={fileInputRef}
          type="file"
          className={styles.fileInput}
          onChange={handleUpload}
        />
        <Button size="sm" onClick={() => fileInputRef.current?.click()} loading={uploadMutation.isPending}>
          &gt; Upload File
        </Button>
      </div>

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Delete File"
        message={`Permanently delete ${confirmDelete?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (confirmDelete) {
            deleteMutation.mutate(confirmDelete.path);
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* File list */}
      <Card variant="glass" padding="sm" className={styles.fileCard}>
        {isLoading ? (
          <p className={styles.loading}>Loading files...</p>
        ) : error ? (
          <p className={styles.empty}>Failed to load files</p>
        ) : !files || files.length === 0 ? (
          <p className={styles.empty}>Empty directory</p>
        ) : (
          <div className={styles.fileList}>
            <div className={styles.fileHeader}>
              <span className={styles.colName}>Name</span>
              <span className={styles.colSize}>Size</span>
              <span className={styles.colDate}>Modified</span>
              <span className={styles.colActions} />
            </div>
            {files.map((entry) => (
              <div key={entry.path} className={styles.fileRow}>
                <span
                  className={`${styles.colName} ${entry.isDirectory ? styles.dir : styles.file}`}
                  onClick={() => handleOpenFile(entry)}
                >
                  {entry.isDirectory ? '📁' : '📄'} {entry.name}
                </span>
                <span className={styles.colSize}>
                  {entry.isDirectory ? '—' : formatSize(entry.size)}
                </span>
                <span className={styles.colDate}>{entry.lastModified}</span>
                <span className={styles.colActions}>
                  {!entry.isDirectory && (
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleOpenFile(entry)}
                      title="Edit"
                      aria-label="Edit file"
                    >✏️</button>
                  )}
                  <button
                    className={styles.actionBtn}
                    onClick={() => setConfirmDelete(entry)}
                    title="Delete"
                    aria-label="Delete file"
                  >🗑️</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* File editor modal */}
      {editorOpen && selectedFile && (
        <div className={styles.overlay} onClick={() => !writeMutation.isPending && setEditorOpen(false)}>
          <div className={styles.editor} onClick={(e) => e.stopPropagation()}>
            <div className={styles.editorHeader}>
              <span className={styles.editorTitle}>Editing: {selectedFile.name}</span>
              <button className={styles.editorClose} onClick={() => setEditorOpen(false)}>✕</button>
            </div>
            <textarea
              className={styles.editorBody}
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              spellCheck={false}
            />
            <div className={styles.editorActions}>
              <Button variant="ghost" size="sm" onClick={() => setEditorOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveFile} loading={writeMutation.isPending}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
