import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`px-6 py-4 border-b border-bunny-border bg-bunny-primary-light/30 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <h3 className={`text-lg font-bold text-bunny-text leading-tight ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <p className={`text-sm text-bunny-text-muted mt-1 ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`px-6 py-3.5 border-t border-bunny-border bg-bunny-paper/60 text-xs text-bunny-text-muted ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardComponent: React.FC<CardProps> = ({
  className = '',
  hoverEffect = false,
  children,
  ...props
}) => {
  return (
    <div
      className={`bg-white/95 backdrop-blur-sm border border-bunny-border rounded-2xl shadow-bunny overflow-hidden transition-all duration-200
        ${hoverEffect ? 'hover:shadow-bunny-lg hover:-translate-y-0.5' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const Card = CardComponent as React.FC<CardProps> & {
  Header: typeof CardHeader;
  Title: typeof CardTitle;
  Description: typeof CardDescription;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
};

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Body = CardBody;
Card.Footer = CardFooter;
