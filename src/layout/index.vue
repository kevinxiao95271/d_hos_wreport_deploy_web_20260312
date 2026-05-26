<template>
  <div class="layout-wrapper">
    <aside class="layout-sidebar">
      <div class="sidebar-logo">
        <span class="logo-title">工作上报系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="#001529"
        text-color="#ffffffa6"
        active-text-color="#ffffff"
        router
      >
        <template v-if="userStore.isAdmin">
          <el-menu-item index="/admin/template-list">
            <el-icon><Document /></el-icon>
            <span>模板管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/task-list">
            <el-icon><Calendar /></el-icon>
            <span>任务管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/record-review">
            <el-icon><DataAnalysis /></el-icon>
            <span>上报审阅</span>
          </el-menu-item>
          <el-menu-item index="/admin/crossview">
            <el-icon><Grid /></el-icon>
            <span>数据汇聚</span>
          </el-menu-item>
          <el-menu-item index="/admin/data-dashboard">
            <el-icon><Histogram /></el-icon>
            <span>数据看板</span>
          </el-menu-item>
          <el-menu-item index="/admin/dw-config">
            <el-icon><Setting /></el-icon>
            <span>日常工作配置</span>
          </el-menu-item>
          <el-menu-item index="/score/board414">
            <el-icon><DataLine /></el-icon>
            <span>历史得分看板</span>
          </el-menu-item>
        </template>
        <template v-else>
          <el-menu-item index="/org/task-list">
            <el-icon><List /></el-icon>
            <span>上报任务</span>
          </el-menu-item>
          <el-menu-item index="/org/record-list">
            <el-icon><Finished /></el-icon>
            <span>我的上报</span>
          </el-menu-item>
        </template>
      </el-menu>
    </aside>

    <div class="layout-main">
      <header class="layout-header">
        <div class="header-breadcrumb">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>日常工作管理</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <span class="user-info">{{ userStore.realName || userStore.account }}</span>
          <span v-if="userStore.orgName" class="org-tag">{{ userStore.orgName }}</span>
          <el-button text @click="handleLogout">
            <el-icon><SwitchButton /></el-icon> 退出
          </el-button>
        </div>
      </header>

      <main class="layout-content">
        <router-view v-slot="{ Component }">
          <component :is="Component" :key="$route.fullPath" />
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '')

async function handleLogout() {
  await ElMessageBox.confirm('确认退出登录？', '提示', { type: 'warning' })
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.layout-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #001529;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.sidebar-logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #ffffff1a;
}
.logo-title {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
}
.layout-sidebar :deep(.el-menu) { border-right: none; flex: 1; }
.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f0f2f5;
}
.layout-header {
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-info { font-size: 14px; color: #333; }
.org-tag {
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
}
.layout-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
</style>
