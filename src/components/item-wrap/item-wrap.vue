<!--
 * @Author: daidai
 * @Date: 2022-03-01 09:16:22
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-09-29 15:12:34
 * @FilePath: \web-pc\src\pages\big-screen\components\item-wrap\item-wrap.vue
-->
<template>
  <div class="glass-card">
    <div class="card-header" v-if="title !== ''">
      <div class="header-line"></div>
      <h3 class="card-title">{{ title }}</h3>
      <div class="header-line"></div>
    </div>
    <div class="card-content" :class="{ 'has-title': title !== '' }">
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {};
  },
  props: {
    title: {
      type: String,
      default: () => "",
    },
  },
  created() {},

  mounted() {},
  methods: {},
};
</script>
<style lang='scss' scoped>
.glass-card {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  
  /* 玻璃卡片主效果 */
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.03) 100%
  );
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);

  /* 顶部渐变光边 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(0, 190, 255, 0.6),
      rgba(0, 255, 200, 0.4),
      rgba(0, 190, 255, 0.6),
      transparent
    );
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px 20px 10px;
    gap: 16px;

    .header-line {
      flex: 1;
      max-width: 60px;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(0, 190, 255, 0.5),
        transparent
      );
    }

    .card-title {
      font-size: 30px;
      font-weight: 900;
      letter-spacing: 4px;
      margin: 0;
      background: linear-gradient(
        92deg,
        #00eaff 0%,
        #00ffaa 50%,
        #00eaff 100%
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 30px rgba(0, 234, 255, 0.5);
      filter: drop-shadow(0 0 12px rgba(0, 234, 255, 0.6));
      white-space: nowrap;
    }
  }

  .card-content {
    width: 100%;
    height: calc(100% - 56px);
    padding: 0 16px 16px;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    z-index: 1;
    isolation: isolate;
    contain: layout style;

    &.has-title {
      height: calc(100% - 56px);
    }
  }
}
</style>
