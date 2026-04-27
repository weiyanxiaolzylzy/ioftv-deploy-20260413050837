<template>
  <div class="login-container">
    <!-- 左侧欢迎图片区 -->
    <div class="left-section">
      <div class="welcome-image-container">
        <!-- 预留图片位置，您可以修改 src 属性更换图片 -->
        <img src="/img/dowload.jpg" alt="Login Background" class="full-screen-image" />
      </div>
    </div>

    <!-- 右侧登录框区 -->
    <div class="right-section">
      <div class="login-box">
        <div class="login-header">
          <div class="logo-box">
            <img src="@/assets/img/logo/logo.png" alt="Logo" class="login-logo">
          </div>
          <h1>钢结构数字孪生智能检测系统</h1>
        </div>

        <div class="login-form">
          <div class="form-group">
            <label>用户名</label>
            <input 
              v-model="username" 
              type="text" 
              placeholder="请输入用户名"
              @keyup.enter="handleLogin"
            />
          </div>

          <div class="form-group">
            <label>密码</label>
            <input 
              v-model="password" 
              type="password" 
              placeholder="请输入密码"
              @keyup.enter="handleLogin"
            />
          </div>

          <div class="form-group">
            <label>权限</label>
            <select v-model="role">
              <option value="admin">质量员 (QA)</option>
              <option value="operator">质检员 (QC)</option>
              <option value="viewer">其他人员</option>
            </select>
          </div>

          <button class="login-btn" @click="handleLogin">登录</button>

          <!-- <div class="test-accounts">
            <p class="hint">测试账号：</p>
            <div class="account-list">
              <div class="account-item" @click="quickLogin('admin')">
                <span class="role-badge admin">管理员</span>
                <span class="account-info">admin / admin123</span>
              </div>
              <div class="account-item" @click="quickLogin('operator')">
                <span class="role-badge operator">操作员</span>
                <span class="account-info">operator / operator123</span>
              </div>
              <div class="account-item" @click="quickLogin('viewer')">
                <span class="role-badge viewer">查看员</span>
                <span class="account-info">viewer / viewer123</span>
              </div>
            </div>
          </div> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoginView',
  data() {
    return {
      username: '',
      password: '',
      role: 'admin',
      users: [
        {
          username: 'admin',
          password: 'admin123',
          role: 'admin',
          roleName: '质量员 (QA)',
          permissions: ['view', 'edit', 'delete', 'manage']
        },
        {
          username: 'operator',
          password: 'operator123',
          role: 'operator',
          roleName: '质检员 (QC)',
          permissions: ['view', 'edit']
        },
        {
          username: 'viewer',
          password: 'viewer123',
          role: 'viewer',
          roleName: '其他人员',
          permissions: ['view']
        }
      ]
    }
  },
  methods: {
    handleLogin() {
      if (!this.username || !this.password) {
        if (this.$message && this.$message.warning) {
          this.$message.warning('请输入用户名和密码')
        } else {
          alert('请输入用户名和密码')
        }
        return
      }

      const user = this.users.find(
        u => u.username === this.username && 
             u.password === this.password && 
             u.role === this.role
      )

      if (user) {
        // 保存用户信息到本地存储
        localStorage.setItem('userInfo', JSON.stringify({
          username: user.username,
          role: user.role,
          roleName: user.roleName,
          permissions: user.permissions,
          loginTime: new Date().toISOString()
        }))

        if (this.$message && this.$message.success) {
          this.$message.success(`登录成功！欢迎 ${user.roleName} ${user.username}`)
        } else {
          alert(`登录成功！欢迎 ${user.roleName} ${user.username}`)
        }
        
        // 跳转到主界面
        setTimeout(() => {
          this.$router.push('/home/index')
        }, 500)
      } else {
        if (this.$message && this.$message.error) {
          this.$message.error('用户名、密码或权限不匹配')
        } else {
          alert('用户名、密码或权限不匹配')
        }
      }
    },
    quickLogin(roleType) {
      const user = this.users.find(u => u.role === roleType)
      if (user) {
        this.username = user.username
        this.password = user.password
        this.role = user.role
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  overflow: hidden;
  position: relative;
  background: #0a1525;
}

// 左侧欢迎图片区
.left-section {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0d1929 0%, #1a2942 100%);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(74, 144, 226, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: moveGrid 25s linear infinite;
  }

  @keyframes moveGrid {
    0% {
      transform: translate(0, 0);
    }
    100% {
      transform: translate(40px, 40px);
    }
  }

  .welcome-image-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #000; /* Optional: background color if image doesn't cover */

    .full-screen-image {
      width: 100%;
      height: 100%;
      object-fit: cover; /* Ensures image covers the container */
      display: block;
    }
  }
}

// 右侧登录区
.right-section {
  width: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(230, 240, 255, 0.95); /* Very light blue background */
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow-y: auto;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 2px;
    height: 100%;
    background: linear-gradient(180deg, transparent 0%, #4a90e2 50%, transparent 100%);
  }
}

.login-box {
  width: 100%;
  padding: 40px 50px; /* Reduced top padding to move content up */
  box-sizing: border-box;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
  
  .logo-box {
    display: flex;
    justify-content: center;
    margin-bottom: 30px; /* Increased spacing */
    
    .login-logo {
      height: 80px;
      width: auto;
      object-fit: contain;
    }
  }

  h1 {
    font-size: 28px; /* Increased from 26px */
    font-weight: 700;
    color: #333; /* Dark text for light background */
    margin: 0 0 10px 0;
    letter-spacing: 2px;
    line-height: 1.4;
  }
}

.login-form {
  .form-group {
    margin-bottom: 25px; /* Increased spacing */
    
    label {
      display: block;
      font-size: 16px; /* Increased from 14px */
      color: #333; /* Dark label for light background */
      margin-bottom: 10px;
      font-weight: 500;
    }
    
    input,
    select {
      width: 100%;
      height: 50px; /* Increased from 45px */
      background: #f5f7fa; /* Light input background */
      border: 1px solid #dcdfe6; /* Light border */
      border-radius: 4px;
      padding: 0 15px;
      font-size: 16px; /* Increased from 14px */
      color: #333; /* Dark input text */
      transition: all 0.3s;
      box-sizing: border-box;
      
      &:focus {
        outline: none;
        border-color: #64B5F6;
        background: #fff;
      }
      
      &::placeholder {
        color: #999;
      }
    }
    
    select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E"); /* Dark arrow */
      background-repeat: no-repeat;
      background-position: right 15px center;
      padding-right: 40px;
      
      option {
        background: #fff;
        color: #333;
      }
    }
  }
  
  .login-btn {
    width: 100%;
    height: 50px; /* Increased from 45px */
    background: #64B5F6;
    border: none;
    border-radius: 4px;
    color: #fff;
    font-size: 18px; /* Increased from 16px */
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 4px 12px rgba(100, 181, 246, 0.3);
    margin-top: 15px; /* Increased spacing */
    box-sizing: border-box; /* Ensure padding/border doesn't affect width */
    
    &:hover {
      background: #42A5F5; /* Slightly darker on hover */
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(100, 181, 246, 0.4);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
}

.test-accounts {
  margin-top: 25px;
  padding-top: 18px;
  border-top: 1px solid #2a3952;
  
  .hint {
    font-size: 12px;
    color: #667788;
    margin: 0 0 12px 0;
  }
  
  .account-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .account-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: rgba(26, 41, 66, 0.3);
    border: 1px solid #2a3952;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;
    
    &:hover {
      background: rgba(26, 41, 66, 0.6);
      border-color: #4a90e2;
    }
    
    .role-badge {
      flex-shrink: 0;
      padding: 4px 10px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 600;
      
      &.admin {
        background: rgba(231, 76, 60, 0.2);
        color: #e74c3c;
        border: 1px solid #e74c3c;
      }
      
      &.operator {
        background: rgba(52, 152, 219, 0.2);
        color: #3498db;
        border: 1px solid #3498db;
      }
      
      &.viewer {
        background: rgba(46, 204, 113, 0.2);
        color: #2ecc71;
        border: 1px solid #2ecc71;
      }
    }
    
    .account-info {
      font-size: 13px;
      color: #8899aa;
    }
  }
}
</style>
