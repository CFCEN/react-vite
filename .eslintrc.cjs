module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    '@tencent/eslint-config-tencent',
    '@tencent/eslint-config-tencent/ts',
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['react', '@typescript-eslint', 'simple-import-sort'],
  rules: {
    // 对 import 的模块进行排序和分组
    'simple-import-sort/imports': 'error',
    // 对 export 的模块进行排序
    'simple-import-sort/exports': 'error',
    // 以下两条规则 Prettier 与 ESLint 冲突，CodeCC 并未配置 Prettier，需单独提出
    // 强制一行的最大长度，限制单行不能超过 120 个字符，字符串和正则表达式除外
    'max-len': [
      'error',
      {
        code: 120,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreRegExpLiterals: true,
        ignoreTemplateLiterals: true,
      },
    ],
    'operator-linebreak': 'off',
    // TypeScript 类的顺序
    '@typescript-eslint/member-ordering': [
      'error',
      { classes: ['field', 'constructor', 'method'] },
    ],
    'array-callback-return': 'error',
    '@typescript-eslint/no-empty-function': 0, // 允许方法体是空的
    '@typescript-eslint/no-var-requires': 0, // 允许使用 require 导入
    '@typescript-eslint/no-require-imports': 0, // 跟 no-var-requires 规则一起使用,允许使用 require 导入
    '@typescript-eslint/no-non-null-assertion': 0, // 允许使用！后缀操作符的非空断言
    '@typescript-eslint/no-inferrable-types': 'off', // 允许方法默认值增加类型
    '@typescript-eslint/no-explicit-any': 'off', // 允许 any 类型
    '@typescript-eslint/no-duplicate-enum-values': 'off', // 允许枚举值重复
    '@typescript-eslint/naming-convention': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: false,
        checksConditionals: false,
      },
    ],
    'no-unsafe-optional-chaining': 0, // 允许 '?.' 操作的返回值是 undefined
    'no-param-reassign': 0, // 允许对方法的入参进行修改
    'no-empty-pattern': 0, // 方法入参可以是一个空对象
  },
  overrides: [
    {
      // ts 和 tsx 文件,额外添加编码规范检查
      files: '*.{ts,tsx}',
      // 关闭 JSX 中对 React 的引入依赖规则检查
      rules: {
        'react/jsx-uses-react': 'off',
        'react/react-in-jsx-scope': 'off',
      },
    },
    {
      // 单元测试文件，指定为 Jest 检查环境
      files: ['*.test.js', '*.spec.js'],
      env: { jest: true },
    },
  ],
  // 忽略构建产物 dist、单测覆盖率报告 coverage，开启.rc 配置文件的检查（默认忽略 node_modules）
  ignorePatterns: [
    'dist',
    'coverage',
    '!.*rc.js',
    'script',
    'server',
    '.prettierrc.js',
    'I18N.ts',
  ],
  settings: {
    // 自动检测项目中已安装的 React 版本
    react: { version: 'detect' },
  },
};
