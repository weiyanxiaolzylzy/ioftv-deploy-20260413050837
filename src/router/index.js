/*
 * @Author: daidai
 * @Date: 2022-01-12 14:22:29
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-04-28 14:53:02
 * @FilePath: \web-pc\src\pages\big-screen\router\index.js
 */
import Vue from "vue";
import VueRouter from "vue-router";

Vue.use(VueRouter);

const routes = [  {
  path: '/',
  redirect: '/login',
},
{
  path: '/login',
  name: 'login',
  component: () => import(/* webpackChunkName: "login" */ '../views/login/index.vue'),
},
{
  path: '/index',
  redirect: '/home/index',
},
{
  path: '/home',
  component: () => import(/* webpackChunkName: "LSD.bighome" */ '../views/home.vue'),
  children:[
    {
      path: '',
      redirect: 'index',
    },
    {
      path: 'index',
      name: 'index',
      component: () => import(/* webpackChunkName: "LSD.bighome" */ '../views/indexs/index.vue'),
    },
  ]
},
{
  path: '/secondview',
  name: 'secondview',
  component: () => import(/* webpackChunkName: "secondview" */ '../views/secondview/index.vue'),
},
{
  path: '/project-ifc',
  name: 'project-ifc',
  component: () => import(/* webpackChunkName: "project-ifc" */ '../views/project-ifc/index.vue'),
},
];
const router = new VueRouter({
  mode: "hash",
  // base: process.env.BASE_URL,
  routes
});

router.beforeEach((to, from, next) => {
  const isLogin = to.path === '/login'
  let userInfo = null
  try {
    userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null')
  } catch (e) {
    userInfo = null
  }

  if (!userInfo && !isLogin) {
    next('/login')
    return
  }
  if (userInfo && isLogin) {
    next('/home/index')
    return
  }
  next()
})

export default router;
