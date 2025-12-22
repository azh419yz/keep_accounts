/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    /**
     * 微信官方示例里的 userInfo，保留不动
     */
    userInfo?: WechatMiniprogram.UserInfo,
    /**
     * 记好帐-当前登录用户（与 userInfo 一致，用于本项目）
     */
    user?: WechatMiniprogram.UserInfo | null,
    /**
     * 当前登录用户的 openid（来自云开发 login 云函数）
     */
    openid?: string,
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}