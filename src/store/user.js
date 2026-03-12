import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('wr_token') || '',
    userId: localStorage.getItem('wr_userId') || '',
    account: localStorage.getItem('wr_account') || '',
    realName: localStorage.getItem('wr_realName') || '',
    orgId: localStorage.getItem('wr_orgId') || '',
    orgName: localStorage.getItem('wr_orgName') || '',
    roleCode: localStorage.getItem('wr_roleCode') || ''
  }),
  getters: {
    isAdmin: state => state.roleCode === 'deptAdmin',
    isOrg:   state => ['qcUser', 'medicalUser'].includes(state.roleCode),
    isLoggedIn: state => !!state.token
  },
  actions: {
    setUser(data) {
      this.token    = data.token
      this.userId   = data.userId
      this.account  = data.account
      this.realName = data.realName
      this.orgId    = data.orgId
      this.orgName  = data.orgName
      this.roleCode = data.roleCode
      localStorage.setItem('wr_token',    data.token)
      localStorage.setItem('wr_userId',   data.userId)
      localStorage.setItem('wr_account',  data.account)
      localStorage.setItem('wr_realName', data.realName)
      localStorage.setItem('wr_orgId',    data.orgId)
      localStorage.setItem('wr_orgName',  data.orgName)
      localStorage.setItem('wr_roleCode', data.roleCode)
    },
    logout() {
      this.$reset()
      localStorage.removeItem('wr_token')
      localStorage.removeItem('wr_userId')
      localStorage.removeItem('wr_account')
      localStorage.removeItem('wr_realName')
      localStorage.removeItem('wr_orgId')
      localStorage.removeItem('wr_orgName')
      localStorage.removeItem('wr_roleCode')
    }
  }
})
