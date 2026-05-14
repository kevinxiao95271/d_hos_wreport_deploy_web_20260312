<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-title">
        <h2>工作上报管理系统</h2>
        <p>Work Report Management</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleLogin">
        <el-form-item prop="account">
          <el-input v-model="form.account" placeholder="登录账号" prefix-icon="User" clearable />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="登录密码" prefix-icon="Lock" show-password clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" style="width:100%" :loading="loading" @click="handleLogin">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { login } from '@/api/auth'
import { isWreportAdmin } from '@/utils/roles'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)

const form = ref({ account: '', password: '' })
const rules = {
  account:  [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  try {
    await formRef.value.validate()
  } catch { return }
  loading.value = true
  try {
    const res = await login(form.value)
    userStore.setUser(res.data)
    router.push(isWreportAdmin(res.data.roleCode) ? '/admin/template-list' : '/org/task-list')
  } catch {
    // ElMessage already shown by request interceptor
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a3a5c 0%, #0d6efd 100%);
}
.login-card {
  width: 400px;
  background: #fff;
  border-radius: 12px;
  padding: 48px 40px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.login-title { text-align: center; margin-bottom: 36px; }
.login-title h2 { font-size: 22px; color: #1a3a5c; margin: 0 0 6px; }
.login-title p { font-size: 13px; color: #999; margin: 0; }
</style>
