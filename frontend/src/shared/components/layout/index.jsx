import React from "react";
import clsx from "clsx";

const widthClasses = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-[1440px]",
  "2xl": "max-w-[1680px]",
  fluid: "max-w-[1920px]",
  none: "max-w-none",
};

const paddingClasses = {
  none: "",
  page: "px-4 sm:px-6 lg:px-8 2xl:px-10",
  tight: "px-3 sm:px-4 lg:px-6",
};

const sectionSpacing = {
  none: "",
  sm: "py-6 sm:py-8 lg:py-10",
  md: "py-8 sm:py-10 lg:py-14",
  lg: "py-10 sm:py-14 lg:py-18",
};

export function ContentWrapper({
  as: Component = "div",
  size = "fluid",
  padding = "page",
  className,
  children,
  ...props
}) {
  return (
    <Component
      className={clsx(
        "mx-auto w-full min-w-0",
        widthClasses[size],
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function AppContainer({
  as: Component = "div",
  className,
  children,
  ...props
}) {
  return (
    <Component
      className={clsx(
        "min-h-screen w-full overflow-x-clip bg-app text-app transition-colors duration-300",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function PageContainer({
  as: Component = "div",
  size = "fluid",
  className,
  children,
  ...props
}) {
  return (
    <ContentWrapper
      as={Component}
      size={size}
      className={clsx("py-6 sm:py-8 lg:py-10", className)}
      {...props}
    >
      {children}
    </ContentWrapper>
  );
}

export function Section({
  as: Component = "section",
  size = "fluid",
  spacing = "md",
  flush = false,
  className,
  children,
  ...props
}) {
  if (flush) {
    return (
      <Component
        className={clsx("w-full min-w-0", sectionSpacing[spacing], className)}
        {...props}
      >
        {children}
      </Component>
    );
  }

  return (
    <ContentWrapper
      as={Component}
      size={size}
      className={clsx(sectionSpacing[spacing], className)}
      {...props}
    >
      {children}
    </ContentWrapper>
  );
}

export function ResponsiveGrid({
  as: Component = "div",
  variant = "products",
  className,
  children,
  ...props
}) {
  const variants = {
    products:
      "grid grid-cols-2 gap-3 min-[375px]:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 [@media(min-width:1800px)]:grid-cols-6 sm:gap-5 lg:gap-6",
    cards:
      "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 sm:gap-5 lg:gap-6",
    sections: "grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8",
  };

  return (
    <Component
      className={clsx("w-full min-w-0", variants[variant], className)}
      {...props}
    >
      {children}
    </Component>
  );
}
