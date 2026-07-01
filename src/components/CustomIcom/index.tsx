import Icon from '@ant-design/icons';
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import type { ComponentType } from 'react';

interface CustomIconProps {
  iconName: string;
  type?: 'svg' | 'img';
  iconWidth?: number;
  iconHeight?: number;
  title?: string;
}

const svgIcons = import.meta.glob<string>('/src/assets/svg/*.svg', {
  eager: true,
  import: 'default',
  query: '?raw',
});

const imgIcons = import.meta.glob<string>(
  '/src/assets/img/*.{png,jpg,jpeg,gif,webp,avif}',
  {
    eager: true,
    import: 'default',
    query: '?url',
  },
);

const getIconKey = (type: NonNullable<CustomIconProps['type']>, iconName: string) =>
  type === 'svg' ? `/src/assets/svg/${iconName}.svg` : `/src/assets/img/${iconName}.png`;

const getSvgMeta = (svg: string) => {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 1024 1024';
  const body = svg
    .replace(/<svg[^>]*>/i, '')
    .replace(/<\/svg>/i, '')
    .trim();

  return { viewBox, body };
};

const CustomIcon = ({
  iconName,
  type = 'svg',
  iconWidth,
  iconHeight,
  title,
}: CustomIconProps) => {
  if (type === 'img') {
    const iconPath = imgIcons[getIconKey(type, iconName)];

    if (!iconPath) {
      return null;
    }

    return (
      <img
        src={iconPath}
        alt={title ?? iconName}
        width={iconWidth ?? 16}
        height={iconHeight ?? 16}
      />
    );
  }

  const svg = svgIcons[getIconKey(type, iconName)];

  if (!svg) {
    return null;
  }

  const { viewBox, body } = getSvgMeta(svg);
  const iconComponent: ComponentType<CustomIconComponentProps> = (props) => (
    <svg
      {...props}
      width={iconWidth ?? '1em'}
      height={iconHeight ?? '1em'}
      fill="currentColor"
      viewBox={viewBox}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <g dangerouslySetInnerHTML={{ __html: body }} />
    </svg>
  );

  return <Icon component={iconComponent} />;
};

export default CustomIcon;
