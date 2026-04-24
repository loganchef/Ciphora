import { useState, useEffect } from 'react';
import { tauriAPI } from '../api/tauri-api';

export function useGroups() {
  const [groups, setGroups] = useState([]);
  const [currentGroupId, setCurrentGroupId] = useState('all');
  const [loading, setLoading] = useState(false);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const result = await tauriAPI.getGroups();
      setGroups(result || []);
    } catch (error) {
      console.error('加载分组失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const addGroup = async (name, color, icon, iconColor) => {
    try {
      const result = await tauriAPI.addGroup(name, color, icon, iconColor);
      await loadGroups();
      return result;
    } catch (error) {
      console.error('添加分组失败:', error);
      throw error;
    }
  };

  const updateGroup = async (id, name, color, icon, iconColor) => {
    try {
      const result = await tauriAPI.updateGroup(id, name, color, icon, iconColor);
      await loadGroups();
      return result;
    } catch (error) {
      console.error('更新分组失败:', error);
      throw error;
    }
  };

  const deleteGroup = async (id) => {
    try {
      await tauriAPI.deleteGroup(id);
      await loadGroups();
      if (currentGroupId === id) {
        setCurrentGroupId('all');
      }
    } catch (error) {
      console.error('删除分组失败:', error);
      throw error;
    }
  };

  const reorderGroups = async (groupIds) => {
    try {
      await tauriAPI.reorderGroups(groupIds);
      await loadGroups();
    } catch (error) {
      console.error('重排分组失败:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  return {
    groups,
    currentGroupId,
    setCurrentGroupId,
    loadGroups,
    addGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
    loading,
  };
}
