import { useEffect, useState } from 'react';
import TaskDemo from './components/TaskDemo.jsx';
import BackupPanel from './components/BackupPanel.jsx';
import { requestPersistentStorage } from './db.js';

export default function App() {
  const [tab, setTab] = useState('viec');
  const [persisted, setPersisted] = useState(null);

  useEffect(() => {
    requestPersistentStorage().then(setPersisted).catch(() => setPersisted(false));
  }, []);

  return (
    <div className="app">
      <nav className="tabs">
        <button className={tab === 'viec' ? 'active' : ''} onClick={() => setTab('viec')}>Việc</button>
        <button className={tab === 'saoluu' ? 'active' : ''} onClick={() => setTab('saoluu')}>Sao lưu</button>
      </nav>

      {tab === 'viec' ? <TaskDemo /> : <BackupPanel />}

      {persisted === false && (
        <p className="warn small">
          Trình duyệt chưa cho lưu lâu dài. Trên iPhone, hãy mở bằng icon trên Màn hình chính và xuất sao lưu thường xuyên.
        </p>
      )}
    </div>
  );
}
