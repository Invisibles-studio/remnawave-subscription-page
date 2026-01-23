import {
    TSubscriptionPageAppConfig,
    TSubscriptionPageButtonConfig,
    TSubscriptionPagePlatformKey
} from '@remnawave/subscription-page-types'
import { notifications } from '@mantine/notifications'
import { useClipboard } from '@mantine/hooks'
import Lottie from 'lottie-react'
import { useState } from 'react'
import clsx from 'clsx'

import { constructSubscriptionUrl } from '@shared/utils/construct-subscription-url'
import { useSubscription } from '@entities/subscription-info-store'
import { getLocalizedText } from '@shared/utils/config-parser'
import { TemplateEngine } from '@shared/utils/template-engine'
import { useAppConfig } from '@entities/app-config-store'
import { vibrate } from '@shared/utils/vibrate'
import { useTranslation } from '@shared/hooks'

import animationData from '../../../../public/assets/AnimatedSticker.json'
import classes from './setup-wizard.module.css'

interface IProps {
    hasPlatformApps: Record<TSubscriptionPagePlatformKey, boolean>
    platform: TSubscriptionPagePlatformKey | undefined
}

export const SetupWizardWidget = ({ hasPlatformApps, platform }: IProps) => {
    const { t, currentLang, baseTranslations } = useTranslation()
    const { platforms } = useAppConfig()
    const { copy } = useClipboard({ timeout: 2_000 })
    const subscription = useSubscription()

    const [currentStep, setCurrentStep] = useState(1)
    const [selectedAppIndex, setSelectedAppIndex] = useState(0)

    // Auto-detect platform, no user selection
    const selectedPlatform: TSubscriptionPagePlatformKey = (() => {
        if (platform && hasPlatformApps[platform]) {
            return platform
        }
        const firstAvailable = (
            Object.keys(hasPlatformApps) as TSubscriptionPagePlatformKey[]
        ).find((key) => hasPlatformApps[key])
        return firstAvailable!
    })()

    const platformApps = platforms[selectedPlatform]?.apps ?? []
    const selectedApp: TSubscriptionPageAppConfig | undefined =
        platformApps[selectedAppIndex] ?? platformApps[0]

    const subscriptionUrl = constructSubscriptionUrl(
        window.location.href,
        subscription.user.shortUuid
    )

    const handleButtonClick = (button: TSubscriptionPageButtonConfig) => {
        let formattedUrl: string | undefined

        if (button.type === 'subscriptionLink' || button.type === 'copyButton') {
            formattedUrl = TemplateEngine.formatWithMetaInfo(button.link, {
                username: subscription.user.username,
                subscriptionUrl
            })
        }

        switch (button.type) {
            case 'copyButton': {
                if (!formattedUrl) return
                copy(formattedUrl)
                notifications.show({
                    title: t(baseTranslations.linkCopied),
                    message: t(baseTranslations.linkCopiedToClipboard),
                    color: 'cyan'
                })
                break
            }
            case 'external': {
                window.open(button.link, '_blank')
                break
            }
            case 'subscriptionLink': {
                if (!formattedUrl) return
                window.open(formattedUrl, '_blank')
                break
            }
            default:
                break
        }
    }

    // Find first button from all blocks (install button - outline)
    const findFirstButton = (): TSubscriptionPageButtonConfig | undefined => {
        if (!selectedApp?.blocks) return undefined
        for (const block of selectedApp.blocks) {
            if (block.buttons?.[0]) {
                return block.buttons[0]
            }
        }
        return undefined
    }

    // Find second button from all blocks (finish button - green)
    const findSecondButton = (): TSubscriptionPageButtonConfig | undefined => {
        if (!selectedApp?.blocks) return undefined
        let buttonCount = 0
        for (const block of selectedApp.blocks) {
            for (const button of block.buttons || []) {
                buttonCount++
                if (buttonCount === 2) {
                    return button
                }
            }
        }
        return undefined
    }

    const installButton = findFirstButton()
    const subscriptionButton = findSecondButton()

    const handleInstallClick = () => {
        if (installButton) {
            handleButtonClick(installButton)
            vibrate([80])
            setCurrentStep(2)
        }
    }

    const handleFinishClick = () => {
        if (subscriptionButton) {
            handleButtonClick(subscriptionButton)
            vibrate([80])
            const totalSteps = selectedApp?.blocks?.length ?? 3
            setCurrentStep(totalSteps)
        }
    }

    const getStepDescription = (stepIndex: number): string => {
        if (!selectedApp?.blocks?.[stepIndex]) {
            return ''
        }
        const block = selectedApp.blocks[stepIndex]
        return getLocalizedText(block.description, currentLang)
    }

    // Build steps dynamically based on blocks count
    const blocksCount = selectedApp?.blocks?.length ?? 0
    const steps = Array.from({ length: blocksCount }, (_, index) => ({
        text: getStepDescription(index),
        isLast: index === blocksCount - 1
    }))

    return (
        <div className={classes.container}>
            <div className={classes.lottieWrapper}>
                <Lottie animationData={animationData} loop={true} />
            </div>

            <h1 className={classes.title}>
                Давайте{'\n'}настроим VPN
            </h1>

            {/* App selector - only if multiple apps */}
            {platformApps.length > 1 && (
                <div className={classes.appSelector}>
                    <div className={classes.appGrid}>
                        {platformApps.map((app, index) => (
                            <button
                                className={clsx(
                                    classes.appButton,
                                    index === selectedAppIndex && classes.appButtonActive,
                                    app.featured && classes.appButtonFeatured
                                )}
                                key={app.name}
                                onClick={() => {
                                    vibrate([40])
                                    setSelectedAppIndex(index)
                                    setCurrentStep(1)
                                }}
                            >
                                {app.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Steps */}
            <div className={classes.stepsContainer}>
                {steps.map((step, index) => {
                    const stepNum = index + 1
                    const isActive = currentStep === stepNum
                    const isCompleted = currentStep > stepNum
                    const isInactive = currentStep < stepNum
                    const isFirst = index === 0
                    const isLast = step.isLast

                    return (
                        <div className={classes.step} key={index}>
                            <div className={classes.stepLeft}>
                                <div
                                    className={clsx(
                                        classes.stepLineTop,
                                        isFirst && classes.stepLineHidden
                                    )}
                                />
                                <div
                                    className={clsx(
                                        classes.stepNumber,
                                        isActive && classes.stepNumberActive,
                                        isCompleted && classes.stepNumberCompleted,
                                        isInactive && classes.stepNumberInactive
                                    )}
                                >
                                    {isCompleted ? '✓' : stepNum}
                                </div>
                                <div
                                    className={clsx(
                                        classes.stepLineBottom,
                                        isLast && classes.stepLineHidden
                                    )}
                                />
                            </div>
                            <div
                                className={clsx(
                                    classes.stepContent,
                                    isActive && classes.stepContentActive
                                )}
                            >
                                <p
                                    className={classes.stepText}
                                    dangerouslySetInnerHTML={{
                                        __html: step.text || `Шаг ${stepNum}`
                                    }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Buttons */}
            <div className={classes.buttonsContainer}>
                {installButton && (
                    <button className={classes.buttonOutline} onClick={handleInstallClick}>
                        {t(installButton.text) || 'Установить приложение'}
                    </button>
                )}

                {subscriptionButton && (
                    <button
                        className={classes.buttonPrimary}
                        onClick={handleFinishClick}
                    >
                        {t(subscriptionButton.text) || 'Завершить настройку'}
                    </button>
                )}
            </div>
        </div>
    )
}
